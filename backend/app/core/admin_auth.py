from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request

from app.config import settings
from app.core.security import verify_password

import secrets

_admin_password_hash = settings.ADMIN_PASSWORD_HASH


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        username = form.get("username", "")
        password = form.get("password", "")

        if username == settings.ADMIN_USERNAME and verify_password(
            password, _admin_password_hash
        ):
            request.session["admin"] = True
            request.session["username"] = username
            return True

        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return request.session.get("admin",False)
