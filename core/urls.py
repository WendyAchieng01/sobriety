from django.urls import path
from . import views

app_name = 'core' 

urlpatterns = [
    path("", views.index, name="index"),
    path("Dashboard/", views.dashboard, name="dashboard"),
    path('api/journal/', views.JournalAPIView.as_view(), name='journal_api'),
    path('api/sobriety-periods/', views.sobriety_periods_api, name='sobriety_periods_api'),
]