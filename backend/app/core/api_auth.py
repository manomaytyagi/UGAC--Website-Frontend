import base64
import binascii
import secrets

from fastapi import HTTPException, Request, status

from app.core.security import verify_password

from app.config import settings

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

_admin_password_hash = settings.ADMIN_PASSWORD_HASH


def _is_public_write(method: str, path: str) -> bool:
    """Write endpoints intentionally left open to the public.

    Only student review submission (POST /reviews/) — it lands in `pending` and is
    moderated from the admin panel. Everything else requires admin credentials.
    """
    p = path.rstrip("/")
    return method == "POST" and path.rstrip("/") == "/api/v1/reviews"


async def write_guard(request: Request) -> None:
    """Gate every mutating request behind HTTP Basic admin credentials.

    Reuses the admin-panel credentials (settings.ADMIN_USERNAME / ADMIN_PASSWORD,
    sourced from Secrets Manager in prod). Reads (GET/HEAD/OPTIONS) and the public
    review-submission endpoint pass through untouched, so the frontend never needs
    credentials and none are ever exposed in the browser.
    """
    if request.method not in MUTATING_METHODS:
        return
    if _is_public_write(request.method, request.url.path):
        return

    header = request.headers.get("Authorization", "")
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin credentials required for this operation",
        headers={"WWW-Authenticate": "Basic"},
    )
    if not header.startswith("Basic "):
        raise unauthorized
    try:
        username, _, password = base64.b64decode(header[6:]).decode("utf-8").partition(":")
    except (binascii.Error, ValueError, UnicodeDecodeError):
        raise unauthorized

    ok_user = secrets.compare_digest(username, settings.ADMIN_USERNAME)
    ok_pass = verify_password(password, _admin_password_hash)
    if not (ok_user and ok_pass):
        raise unauthorized
