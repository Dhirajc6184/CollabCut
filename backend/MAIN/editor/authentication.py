# FILE PATH: backend/MAIN/editor/authentication.py
#
# Decodes the JWT that app/views.py:login() issues.
# Used by editor/views.py via @authentication_classes([JWTAuthentication]).

from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


def _decode_jwt(token: str) -> dict:
    try:
        import jwt
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except Exception:
        raise AuthenticationFailed("Invalid or expired token.")


class FakeUser:
    """
    Lightweight user object that carries id and role from the JWT payload.
    DRF needs is_authenticated and is_active to exist.
    """
    def __init__(self, user_id, role):
        self.id              = int(user_id)
        self.role            = role
        self.is_authenticated = True
        self.is_active        = True


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None          # let DRF try the next authenticator
        token   = auth_header[7:]
        payload = _decode_jwt(token)
        user_id = payload.get("sub")
        role    = payload.get("role", "viewer")
        if not user_id:
            raise AuthenticationFailed("Invalid token payload.")
        return (FakeUser(user_id, role), token) 