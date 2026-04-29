from .models import Project, AppUser, ProjectInvitation
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .serializers import RegisterSerializer, ProjectSerializer
from rest_framework.decorators import api_view
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from .models import Project, AppUser, ProjectInvitation


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

    # ---------------- GET ----------------
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

    # ---------------- POST ----------------
    elif request.method == 'POST':
        name = request.data.get("name")
        user_id = request.data.get("user_id")
        editor_username = request.data.get("editor_username")  # ✅ CHANGED
        video = request.FILES.get("video")

        # ✅ get creator
        user = AppUser.objects.filter(id=user_id).first()
        if not user:
            return JsonResponse({"error": "User not found"}, status=400)

        # ✅ find editor by username
        editor = None
        if editor_username:
            editor = AppUser.objects.filter(
                name=editor_username,
                role="editor"
            ).first()

            if not editor:
                return JsonResponse({"error": "Editor not found"}, status=400)

        # ✅ fix filename
        if video:
            video.name = f"{uuid.uuid4().hex}.mp4"

        # ✅ create project (NO editor assigned yet)
        project = Project.objects.create(
            name=name,
            user=user,
            video=video
        )

        # ✅ create invitation
        if editor:
            ProjectInvitation.objects.create(
                project=project,
                creator=user,
                editor=editor,
                status="pending"
            )

        return JsonResponse({
            "message": "Project created and invitation sent"
        })
    
@csrf_exempt
@api_view(['GET', 'POST'])
def projects(request):

    # ---------------- GET ----------------
    if request.method == 'GET':
        user_id = request.GET.get("user_id")

        projects = Project.objects.filter(user_id=user_id)

        data = []
        for p in projects:
            # 🔥 GET INVITATION STATUS
            invite = ProjectInvitation.objects.filter(project=p).first()

            status = "none"
            if invite:
                status = invite.status  # pending / accepted / rejected

            data.append({
                "id": p.id,
                "name": p.name,
                "video": p.video.url if p.video else None,
                "invite_status": status  # ✅ NEW FIELD
            })

        return JsonResponse(data, safe=False)

    # ---------------- POST ----------------
    elif request.method == 'POST':
        name = request.data.get("name")
        user_id = request.data.get("user_id")
        editor_username = request.data.get("editor_username")
        video = request.FILES.get("video")

        # ✅ GET CREATOR
        user = AppUser.objects.filter(id=user_id).first()
        if not user:
            return JsonResponse({"error": "User not found"}, status=400)

        # ✅ FIND EDITOR
        editor = None
        if editor_username:
            editor = AppUser.objects.filter(
                name__iexact=editor_username.strip(),
                role="editor"
            ).first()

            if not editor:
                return JsonResponse({
                    "error": f"Editor '{editor_username}' not found"
                }, status=400)

        # ✅ FIX FILE NAME
        import uuid
        if video:
            video.name = f"{uuid.uuid4().hex}.mp4"

        # ✅ CREATE PROJECT (NO editor assigned yet)
        project = Project.objects.create(
            name=name,
            user=user,
            video=video
        )

        # ✅ CREATE INVITATION
        if editor:
            ProjectInvitation.objects.create(
                project=project,
                creator=user,
                editor=editor,
                status="pending"
            )

        return JsonResponse({
            "message": "Project created and invitation sent"
        })
    
@api_view(['GET'])
def get_invitations(request):
    editor_id = request.GET.get("editor_id")

    invites = ProjectInvitation.objects.filter(
        editor_id=editor_id,
        status="pending"
    )

    data = []
    for i in invites:
        data.append({
            "id": i.id,
            "project_name": i.project.name,
            "creator": i.creator.name
        })

    return JsonResponse(data, safe=False)

@api_view(['POST'])
def respond_invitation(request):
    invite_id = request.data.get("invite_id")
    action = request.data.get("action")

    invite = ProjectInvitation.objects.filter(id=invite_id).first()

    if not invite:
        return JsonResponse({"error": "Invalid invite"}, status=400)

    if action == "accept":
        invite.status = "accepted"
        invite.project.editor = invite.editor
        invite.project.save()

    elif action == "reject":
        invite.status = "rejected"

    else:
        return JsonResponse({"error": "Invalid action"}, status=400)

    invite.save()

    return JsonResponse({"message": "Invitation updated"})