from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt

from .models import AppUser, Project
from .serializers import RegisterSerializer, ProjectSerializer


@csrf_exempt
@api_view(['POST'])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "User registered"})
    return Response(serializer.errors, status=400)


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
        project_list = Project.objects.filter(user_id=user_id).order_by("-created_at")
        serializer = ProjectSerializer(project_list, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        name = request.data.get("name")
        user_id = request.data.get("user_id")

        if not name or not user_id:
            return Response({"error": "Project name and user_id are required"}, status=400)

        try:
            user = AppUser.objects.get(id=user_id)
        except AppUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        project = Project.objects.create(name=name, user=user)
        serializer = ProjectSerializer(project)
        return Response(serializer.data)