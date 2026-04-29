"""
FILE PATH: backend/MAIN/MAIN/urls.py
REPLACE THE ENTIRE FILE with this content.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/',         include('app.urls')),
    path('api/editor/',  include('editor.urls')),   # ← NEW
] + static(settings.MEDIA_URL,  document_root=settings.MEDIA_ROOT) \
  + static('uploads/', document_root=settings.UPLOAD_DIR) \
  + static('outputs/', document_root=settings.OUTPUT_DIR)