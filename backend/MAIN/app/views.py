from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import AppUser, Project
from .serializers import RegisterSerializer, ProjectSerializer
from rest_framework.decorators import api_view
import os

@csrf_exempt

@api_view(['POST'])
def register(request):
    name = request.data.get("name")
    email = request.data.get("email")
    password = request.data.get("password")
    role = request.data.get("role")

    # ✅ basic validation
    if not name or not email or not password or not role:
        return JsonResponse({"error": "All fields required"}, status=400)

    # ✅ check existing user
    if AppUser.objects.filter(email=email).exists():
        return JsonResponse({"error": "User already exists"}, status=400)

    # ✅ create user
    user = AppUser(
        name=name,
        email=email,
        role=role
    )
    user.set_password(password)
    user.save()

    return JsonResponse({"message": "User registered successfully"})


@csrf_exempt
@api_view(['POST'])
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")

    try:
        user = AppUser.objects.get(email=email)
    except AppUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    if user.check_password(password):
        return Response({
            "message": "Login successful",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            }
        })

    return Response({"error": "Invalid password"}, status=400)


@csrf_exempt
@api_view(['GET', 'POST'])
def projects(request):

    if request.method == 'GET':
        user_id = request.GET.get("user_id")
        projects = Project.objects.filter(user_id=user_id)

        data = []
        for p in projects:
            data.append({
                "id": p.id,
                "name": p.name,
                "video": p.video.url if p.video else None
            })

        return JsonResponse(data, safe=False)

    elif request.method == 'POST':
        name = request.data.get("name")
        user_id = request.data.get("user_id")
        editor_email = request.data.get("editor_email")
        video = request.FILES.get("video")

    user = AppUser.objects.filter(id=user_id).first()
    if not user:
        return JsonResponse({"error": "User not found"}, status=400)

    editor = None
    if editor_email:
        editor = AppUser.objects.filter(email=editor_email).first()

    # 🔥 FIX: shorten filename
    import uuid
    if video:
        video.name = f"{uuid.uuid4().hex}.mp4"

    Project.objects.create(
        name=name,
        user=user,
        editor=editor,
        video=video
    )

    return JsonResponse({"message": "Project created"})
    
def create_project(request):
    name = request.POST.get("name")
    user_id = request.POST.get("user_id")
    editor_id = request.POST.get("editor_id")
    video = request.FILES.get("video")

    user = AppUser.objects.get(id=user_id)

    editor = None
    if editor_id:
        editor = AppUser.objects.filter(id=editor_id, role="editor").first()

    project = Project.objects.create(
        name=name,
        user=user,
        editor=editor,
        video=video
    )

    return JsonResponse({"message": "Project created"})
