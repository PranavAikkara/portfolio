"""Gmail OAuth — desktop-app loopback flow.

Stores refresh token in data/token.json (gitignored).
"""
from __future__ import annotations

import json
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def _client_config(client_id: str, client_secret: str) -> dict:
    return {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }
    }


def get_credentials(
    token_path: Path,
    client_id: str,
    client_secret: str,
) -> Credentials:
    """Load cached credentials or run the loopback flow once."""
    creds: Credentials | None = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_info(
            json.loads(token_path.read_text()), SCOPES
        )

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        flow = InstalledAppFlow.from_client_config(
            _client_config(client_id, client_secret), SCOPES
        )
        # Opens the browser, catches the redirect on a local loopback port.
        creds = flow.run_local_server(port=0)

    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(creds.to_json(), encoding="utf-8")
    return creds


def is_authorized(token_path: Path) -> bool:
    return token_path.exists()
