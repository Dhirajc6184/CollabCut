"""
FILE PATH: backend/MAIN/app/views.py
REPLACE THE ENTIRE FILE with this content.

KEY FIXES vs your current file:
  - The `projects` function was duplicated twice — removed the duplicate
  - login now returns `token` (JWT) so the frontend can auth editor API calls
  - All imports are de-duplicated and cleaned
"""

from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime, timedelta, timezone
import uuid

from .models import Project, AppUser, ProjectInvitation
from .serializers import RegisterSerializer, ProjectSerializer


# ── JWT helper ─────────────────────────────────────────────────────────────────

def _create_jwt(user_id, role):
    """
    Creates a JWT token used by the editor API (editor/views.py).
    Requires PyJWT: pip install PyJWT>=2.8
    """
    try:
        import jwt
        from django.conf import settings
        expiry = datetime.now(tz=timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
        payload = {"sub": str(user_id), "role": role, "exp": expiry}
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        # PyJWT >= 2.0 returns str directly; older returned bytes
        return token if isinstance(token, str) else token.decode()
    except Exception as e:
        print(f"[JWT] token creation failed: {e}")
        return None


# ── Auth ───────────────────────────────────────────────────────────────────────

@csrf_exempt
@api_view(['POST'])
def register(request):
    name     = request.data.get("name")
    email    = request.data.get("email")
    password = request.data.get("password")
    role     = request.data.get("role")

    if not name or not email or not password or not role:
        return JsonResponse({"error": "All fields required"}, status=400)

    if AppUser.objects.filter(email=email).exists():
        return JsonResponse({"error": "User already exists"}, status=400)

    user = AppUser(name=name, email=email, role=role)
    user.set_password(password)
    user.save()

    return JsonResponse({"message": "User registered successfully"})


@csrf_exempt
@api_view(['POST'])
def login(request):
    email    = request.data.get("email")
    password = request.data.get("password")

    try:
        user = AppUser.objects.get(email=email)
    except AppUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    if user.check_password(password):
        token = _create_jwt(user.id, user.role)
        return Response({
            "message": "Login successful",
            "user": {
                "id":    user.id,
                "name":  user.name,
                "email": user.email,
                "role":  user.role,
            },
            "token": token,   # ← NEW: JWT for editor API calls
        })

    return Response({"error": "Invalid password"}, status=400)


# ── Projects ───────────────────────────────────────────────────────────────────

@csrf_exempt
@api_view(['GET', 'POST'])
def projects(request):

    # ── GET: list projects for this user ──
    if request.method == 'GET':
        user_id = request.GET.get("user_id")

        qs = Project.objects.filter(
            Q(user_id=user_id) | Q(editor_id=user_id)
        ).distinct()

        data = []
        for p in qs:
            invite = ProjectInvitation.objects.filter(project=p).first()
            status = invite.status if invite else "none"

            data.append({
                "id":            p.id,
                "name":          p.name,
                "video":         p.video.url if p.video else None,
                "invite_status": status,
                "creator_id":    p.user.id,
                "editor_id":     p.editor.id if p.editor else None,
            })

        return JsonResponse(data, safe=False)

    # ── POST: create a project ──
    elif request.method == 'POST':
        name            = request.data.get("name")
        user_id         = request.data.get("user_id")
        editor_username = request.data.get("editor_username")
        video           = request.FILES.get("video")

        user = AppUser.objects.filter(id=user_id).first()
        if not user:
            return JsonResponse({"error": "User not found"}, status=400)

        editor = None
        if editor_username:
            editor = AppUser.objects.filter(
                name__iexact=editor_username.strip(),
                role="editor"
            ).first()
            if not editor:
                return JsonResponse(
                    {"error": f"Editor '{editor_username}' not found"}, status=400
                )

        if video:
            video.name = f"{uuid.uuid4().hex}.mp4"

        project = Project.objects.create(name=name, user=user, video=video)

        if editor:
            ProjectInvitation.objects.create(
                project=project,
                creator=user,
                editor=editor,
                status="pending"
            )

        return JsonResponse({"message": "Project created and invitation sent"})


# ── Invitations ────────────────────────────────────────────────────────────────

@api_view(['GET'])
def get_invitations(request):
    editor_id = request.GET.get("editor_id")

    invites = ProjectInvitation.objects.filter(
        editor_id=editor_id,
        status="pending"
    )

    data = [
        {
            "id":           i.id,
            "project_name": i.project.name,
            "creator":      i.creator.name,
        }
        for i in invites
    ]
    return JsonResponse(data, safe=False)


@api_view(['POST'])
def respond_invitation(request):
    invite_id = request.data.get("invite_id")
    action    = request.data.get("action")

    invite = ProjectInvitation.objects.filter(id=invite_id).first()
    if not invite:
        return JsonResponse({"error": "Invalid invite"}, status=400)

    if action == "accept":
        invite.status = "accepted"
        invite.project.editor = invite.editor
        invite.project.save()
    elif action == "reject":
        invite.status = "rejected"

    invite.save()
    return JsonResponse({"message": "Updated"})