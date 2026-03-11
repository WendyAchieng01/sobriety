from django.urls import path
from . import views

app_name = 'accounts' 

urlpatterns = [
    path("", views.signup, name="signup"),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('api/profile/', views.ProfileAPIView.as_view(), name='profile_api'),
]