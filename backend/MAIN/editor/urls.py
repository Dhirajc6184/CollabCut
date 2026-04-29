# FILE PATH: backend/MAIN/editor/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path("upload/",                                         views.upload_video),
    path("process/",                                        views.process_video),
    path("files/<str:filename>/",                           views.serve_file),
    path("comments/<int:project_id>/",                      views.comments),
    path("comments/<int:project_id>/<int:comment_id>/",     views.comment_detail),
    path("scene-extract/",                                  views.scene_extract),
    path("scene-extract/<str:job_id>/",                     views.scene_extract_status),
    path("health/",                                         views.health),
]