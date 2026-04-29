from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class AppUser(models.Model):
    ROLE_CHOICES = [
        ('viewer', 'Viewer'),
        ('editor', 'Editor'),
    ]

    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def __str__(self):
        return f"{self.name} ({self.role})"


class Project(models.Model):
    name = models.CharField(max_length=255)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE)
    editor = models.ForeignKey(
        AppUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_projects"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    video = models.FileField(upload_to="videos/", null=True, blank=True)
    
    def __str__(self):
        return f"{self.name}"

class ProjectInvitation(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    creator = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name="sent_invites")
    editor = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name="received_invites")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")

    def __str__(self):
        return f"{self.project.name} -> {self.editor.name} ({self.status})"