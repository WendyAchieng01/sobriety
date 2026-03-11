from django.shortcuts import render
import json
from django.http import JsonResponse
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .models import JournalEntry
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from .models import SobrietyPeriod

import logging
logger = logging.getLogger(__name__)
# Create your views here.

def index(request):
    return render(request, 'landing.html')

def dashboard(request):
    return render(request, 'index.html')

@method_decorator(csrf_exempt, name='dispatch')  # CSRF is handled via the header
class JournalAPIView(LoginRequiredMixin, View):

    def get(self, request):
        entries = JournalEntry.objects.filter(user=request.user).values(
            'id', 'title', 'body', 'date'
        )
        return JsonResponse(list(entries), safe=False)

    def post(self, request):
        try:
            data = json.loads(request.body)
            entry = JournalEntry.objects.create(
                user=request.user,
                title=data.get('title', 'Untitled'),
                body=data.get('body', ''),
            )
            return JsonResponse({
                'id': entry.id,
                'title': entry.title,
                'body': entry.body,
                'date': entry.date.isoformat(),
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)



@login_required
@require_http_methods(["GET", "POST"])
def sobriety_periods_api(request):
    if request.method == "GET":
        periods = SobrietyPeriod.objects.filter(user=request.user)
        return JsonResponse([{
            "id":         p.id,
            "start_date": p.start_date.isoformat(),
            "end_date":   p.end_date.isoformat() if p.end_date else None,
            "days":       p.days,
            "note":       p.note,
        } for p in periods], safe=False)

    if request.method == "POST":
        data   = json.loads(request.body)
        action = data.get("action")

        if action == "start":
            # End any active period first
            SobrietyPeriod.objects.filter(user=request.user, end_date__isnull=True).update(end_date=timezone.now())
            period = SobrietyPeriod.objects.create(
                user=request.user,
                start_date=data.get("start_date", timezone.now()),
                note=data.get("note", ""),
            )
            return JsonResponse({"id": period.id, "start_date": period.start_date.isoformat()})

        if action == "relapse":

            active = SobrietyPeriod.objects.filter(
                user=request.user,
                end_date__isnull=True
            ).first()

            if active:
                active.end_date = timezone.now()
                active.note = data.get("note", "Relapse")
                active.save()

                logger.info(
                    f"[RELAPSE] user={request.user.username} | streak_days={active.days} | note={active.note}"
                )

            period = SobrietyPeriod.objects.create(
                user=request.user,
                start_date=timezone.now(),
            )

            logger.info(
                f"[SOBRIETY] New streak started | user={request.user.username}"
            )

            return JsonResponse({
                "id": period.id,
                "start_date": period.start_date.isoformat(),
                "message": "New period started"
            })
        return JsonResponse({"error": "Unknown action"}, status=400)
