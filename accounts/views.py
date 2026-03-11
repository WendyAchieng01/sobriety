# views.py

from datetime import timezone

from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.models import User

from core.models import SobrietyPeriod
from .models import UserProfile   
import json
from django.http import JsonResponse
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt


# ──────────────────────────────────────────────
#  LOGIN
# ──────────────────────────────────────────────
def login_view(request):
    # Already logged in → go straight to dashboard
    if request.user.is_authenticated:
        return redirect("core:dashboard")

    if request.method == "POST":
        email    = request.POST.get("email", "").strip()
        password = request.POST.get("password", "")

        if not email or not password:
            messages.error(request, "Please enter your email and password.")
            return render(request, "accounts/login.html")

        # Django stores email as username in this project
        user = authenticate(request, username=email, password=password)

        if user is not None:
            auth_login(request, user)

            # Optional: extend session if "Remember me" was checked
            if not request.POST.get("remember_me"):
                # Session expires when the browser closes
                request.session.set_expiry(0)

            return redirect("core:dashboard")
        else:
            messages.error(request, "Invalid email or password. Please try again.")
            return render(request, "accounts/login.html")

    # GET
    return render(request, "accounts/login.html")


# ──────────────────────────────────────────────
#  SIGNUP
# ──────────────────────────────────────────────
def signup(request):
    # Already logged in → go straight to dashboard
    if request.user.is_authenticated:
        return redirect("core:dashboard")

    if request.method == "POST":
        email            = request.POST.get("email", "").strip()
        password         = request.POST.get("password", "")
        confirm_password = request.POST.get("confirm_password", "")
        name             = request.POST.get("name", "").strip()
        recovery_type    = request.POST.get("recovery_type", "").strip()
        avg_daily_spend  = request.POST.get("avg_daily_spend", "").strip() or None
        sobriety_start   = request.POST.get("sobriety_start", "").strip() or None

        # ── Validation ──────────────────────────
        if not email:
            messages.error(request, "Email address is required.")
            return render(request, "signup.html")

        if not password:
            messages.error(request, "Password is required.")
            return render(request, "signup.html")

        if len(password) < 8:
            messages.error(request, "Password must be at least 8 characters.")
            return render(request, "signup.html")

        if password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return render(request, "signup.html")

        if User.objects.filter(username=email).exists():
            messages.error(request, "An account with that email already exists.")
            return render(request, "signup.html")

        # ── Create user ──────────────────────────
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=name,
        )

        # ── Create profile ───────────────────────
        UserProfile.objects.create(
            user=user,
            name=name,
            recovery_type=recovery_type,
            avg_daily_spend=avg_daily_spend if avg_daily_spend else None,
            sobriety_start=sobriety_start,
        )

        # ── Auto-login ───────────────────────────
        # authenticate() attaches the correct auth backend before login()
        authenticated_user = authenticate(
            request,
            username=email,
            password=password,
        )

        if authenticated_user is not None:
            auth_login(request, authenticated_user)
            # Redirect straight to dashboard — no login page needed
            return redirect("core:dashboard")
        else:
            # Shouldn't happen, but handle gracefully
            messages.error(
                request,
                "Account created but automatic sign-in failed. Please log in."
            )
            return redirect("accounts:login")

    # GET
    return render(request, "accounts/signup.html")


def logout_view(request):
    auth_logout(request)
    return redirect("accounts:login")



@method_decorator(csrf_exempt, name='dispatch')
class ProfileAPIView(LoginRequiredMixin, View):

    def get(self, request):
        try:
            profile = request.user.userprofile
        except UserProfile.DoesNotExist:
            return JsonResponse({}, status=404)

        # Always derive sobriety_start from the active SobrietyPeriod
        # so the timer survives cache clears, logouts, and device switches
        active_period = SobrietyPeriod.objects.filter(
            user=request.user,
            end_date__isnull=True
        ).first()

        # First-time user: no active period yet — create one from profile fallback
        if not active_period:
            active_period = SobrietyPeriod.objects.create(
                user=request.user,
                start_date=profile.sobriety_start or timezone.now(),
            )

        return JsonResponse({
            'name':           profile.name,
            'sobriety_start': active_period.start_date.isoformat(),
            'weekly_spend':   float(profile.avg_daily_spend * 7) if profile.avg_daily_spend else 0,
        })

    def post(self, request):
        try:
            data = json.loads(request.body)

            profile, _ = UserProfile.objects.get_or_create(
                user=request.user,
                defaults={
                    'name':           data.get('name', 'Friend'),
                    'sobriety_start': data.get('sobriety_start'),
                    'avg_daily_spend': float(data.get('weekly_spend', 0)) / 7,
                    'recovery_type':  'private',
                }
            )

            # Update name
            if data.get('name'):
                profile.name = data['name']

            # Update weekly spend
            if data.get('weekly_spend') is not None:
                profile.avg_daily_spend = float(data['weekly_spend']) / 7

            # Update sobriety start date — patch the active SobrietyPeriod
            # (this is a manual correction in Settings, not a relapse)
            if data.get('sobriety_start'):
                try:
                    new_start = timezone.datetime.fromisoformat(data['sobriety_start'])
                    if timezone.is_naive(new_start):
                        new_start = timezone.make_aware(new_start)
                except (ValueError, TypeError):
                    return JsonResponse({'error': 'Invalid sobriety_start format'}, status=400)

                # Keep profile field in sync as a fallback
                profile.sobriety_start = new_start

                # Update the active period if it exists, otherwise create one
                active_period = SobrietyPeriod.objects.filter(
                    user=request.user,
                    end_date__isnull=True
                ).first()

                if active_period:
                    active_period.start_date = new_start
                    active_period.save()
                else:
                    SobrietyPeriod.objects.create(
                        user=request.user,
                        start_date=new_start,
                    )

            profile.save()
            return JsonResponse({'status': 'ok'})

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)