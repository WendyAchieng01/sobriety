from django.db import models
from django.contrib.auth.models import User
from django.db import models
from django.contrib.auth import get_user_model
import math
import logging
from django.utils import timezone

class JournalEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journal_entries')
    title = models.CharField(max_length=255)
    body = models.TextField()
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username} — {self.title} ({self.date:%Y-%m-%d})"
    


User = get_user_model()


logger = logging.getLogger(__name__)


class SobrietyPeriod(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sobriety_periods')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ['-start_date']

    def save(self, *args, **kwargs):
        creating = self.pk is None
        super().save(*args, **kwargs)

        if creating:
            logger.info(
                f"[SOBRIETY] New period started | user={self.user.username} | start={self.start_date}"
            )
        else:
            logger.info(
                f"[SOBRIETY] Period updated | user={self.user.username} | start={self.start_date} | end={self.end_date}"
            )

    @property
    def days(self):
        end = self.end_date or timezone.now()
        return math.floor((end - self.start_date).total_seconds() / 86400)