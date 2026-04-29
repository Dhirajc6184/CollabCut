from django.urls import path
from .views import register, login, projects


urlpatterns = [
    path('register/', register),
    path('login/', login),
    path("projects/", projects)
]
