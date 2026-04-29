from django.contrib import admin
from .models import AppUser,Project,ProjectInvitation


# Register your models here.

admin.site.register(AppUser)
admin.site.register(Project)
admin.site.register(ProjectInvitation)

