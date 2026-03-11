from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):

    RECOVERY_CHOICES = [
        ('alcohol', 'Alcohol'),
        ('substances', 'Substances'),
        ('smoking', 'Smoking'),
        ('gambling', 'Gambling'),
        ('other', 'Other'),
        ('private', 'Prefer not to say'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)

    name = models.CharField(max_length=100)

    recovery_type = models.CharField(
        max_length=20,
        choices=RECOVERY_CHOICES
    )

    avg_daily_spend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    sobriety_start = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.email