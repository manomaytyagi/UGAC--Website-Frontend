import httpx
from fastapi import HTTPException
from app.config import settings  

HCAPTCHA_VERIFY_URL = "https://hcaptcha.com/siteverify"

async def verify_hcaptcha(token: str, remote_ip: str | None = None) -> None:
    if not token:
        raise HTTPException(400, "Captcha token missing")

    payload = {"secret": settings.HCAPTCHA_SECRET_KEY, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(HCAPTCHA_VERIFY_URL, data=payload)

    data = resp.json()
    if not data.get("success"):
        raise HTTPException(400, "Captcha verification failed")