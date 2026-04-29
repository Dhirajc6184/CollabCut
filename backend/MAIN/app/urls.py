from django.urls import path
from .views import register, login, projects,get_invitations,respond_invitation


urlpatterns = [
    path('register/', register),
    path('login/', login),
    path("projects/", projects),
    path("invitations/", get_invitations),
    path("invitations/respond/", respond_invitation),
    
]
