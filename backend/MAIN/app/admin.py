from django.contrib import admin
from .models import AppUser, Project, ProjectInvitation

admin.site.register(AppUser)
admin.site.register(Project)
admin.site.register(ProjectInvitation)
