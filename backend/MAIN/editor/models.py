from django.db import models


class VideoComment(models.Model):
    """
    A comment pinned to a specific timestamp on a project video.
    project_id links back to app.Project.
    author_user_id links back to app.AppUser (stored as int, no FK to keep apps decoupled).
    """
    project_id      = models.IntegerField(db_index=True)
    author_user_id  = models.IntegerField()
    author_name     = models.CharField(max_length=150)
    author_role     = models.CharField(max_length=10, default="viewer")
    timestamp_sec   = models.FloatField(help_text="Video time in seconds")
    text            = models.TextField()
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp_sec", "created_at"]

    def __str__(self):
        return f"[project {self.project_id}@{self.timestamp_sec}s] {self.author_name}: {self.text[:40]}"