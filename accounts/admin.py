from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "name",
        "recovery_type",
        "avg_daily_spend",
        "sobriety_start",
        "created_at",
    )

    list_filter = (
        "recovery_type",
        "created_at",
    )

    search_fields = (
        "user__username",
        "user__email",
        "name",
    )

    ordering = ("-created_at",)

    readonly_fields = ("created_at",)

    fieldsets = (
        ("User Info", {
            "fields": ("user", "name")
        }),

        ("Recovery Details", {
            "fields": (
                "recovery_type",
                "avg_daily_spend",
                "sobriety_start",
            )
        }),

        ("Metadata", {
            "fields": ("created_at",)
        }),
    )