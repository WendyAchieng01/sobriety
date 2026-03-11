from django.contrib import admin
from .models import *

@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'date')
    list_filter = ('user',)


@admin.register(SobrietyPeriod)
class SobrietyPeriodAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'start_date',
        'end_date',
        'days',
        'note'
    )

    list_filter = (
        'start_date',
        'end_date',
    )

    search_fields = (
        'user__username',
        'user__email',
        'note',
    )

    ordering = ('-start_date',)

    readonly_fields = ('days',)