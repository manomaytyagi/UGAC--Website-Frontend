from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from app.core.security import get_password_hash

_DEFAULT_SECRET_KEY = "change_me_to_32_chars_random_string_pls"
_DEFAULT_ADMIN_PASSWORD_HASH = get_password_hash("change_me")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/ugac"
    REDIS_URL: str = ""
    REDIS_TOKEN: str = ""
    SECRET_KEY: str = _DEFAULT_SECRET_KEY
    ADMIN_USERNAME: str = "ugac_admin"
    ADMIN_PASSWORD_HASH: str = _DEFAULT_ADMIN_PASSWORD_HASH
    # Set ALLOW_INSECURE_DEFAULTS=true only for throwaway local experiments.
    ALLOW_INSECURE_DEFAULTS: bool = False
    HCAPTCHA_SECRET_KEY: str
    trust_proxy_cidr: str | None = None

    @model_validator(mode="after")
    def _reject_default_secrets(self) -> "Settings":
        if self.ALLOW_INSECURE_DEFAULTS:
            return self
        insecure = []
        if self.SECRET_KEY == _DEFAULT_SECRET_KEY:
            insecure.append("SECRET_KEY")
        if self.ADMIN_PASSWORD_HASH == _DEFAULT_ADMIN_PASSWORD_HASH:
            insecure.append("ADMIN_PASSWORD_HASH")
        if insecure:
            raise ValueError(
                f"Insecure default value(s) for {', '.join(insecure)}. "
                "Set them via environment/Secrets Manager, or set "
                "ALLOW_INSECURE_DEFAULTS=true for local-only use."
            )
        return self

    # "" = AWS S3 native (no endpoint), "local" = local fs, URL = MinIO/custom endpoint
    STORAGE_ENDPOINT: str = "http://localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET: str = "ugac-files"
    AWS_REGION: str = "ap-south-1"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    LOCAL_STORAGE_PATH: str = "./data"


settings = Settings()