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

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(HCAPTCHA_VERIFY_URL, data=payload)
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        # hCaptcha down, slow, or answering with non-JSON. Previously .json()
        # raised straight through and the student got an opaque 500.
        raise HTTPException(503, "Captcha service unavailable. Please try again.") from exc

    if not data.get("success"):
        raise HTTPException(400, "Captcha verification failed")