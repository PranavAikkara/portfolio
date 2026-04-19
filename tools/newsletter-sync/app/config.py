"""Environment config for the sync app."""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PORTFOLIO_REPO_PATH: Path
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    PERSONAL_EMAIL: str = "aikkara.pranav@gmail.com"
    PERSONAL_FIRST_NAME: str = "Pranav"
    FIRST_SYNC_WINDOW_DAYS: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def content_dir(self) -> Path:
        return self.PORTFOLIO_REPO_PATH / "content" / "newsletters"

    @property
    def senders_path(self) -> Path:
        return self.content_dir / "senders.json"

    @property
    def data_dir(self) -> Path:
        return Path(__file__).resolve().parent.parent / "data"

    @property
    def token_path(self) -> Path:
        return self.data_dir / "token.json"

    @property
    def last_sync_path(self) -> Path:
        return self.data_dir / "last_sync.json"


settings = Settings()
