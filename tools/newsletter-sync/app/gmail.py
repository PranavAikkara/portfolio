"""Gmail message fetch + payload parse."""
from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterator

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials


@dataclass
class Message:
    gmail_id: str
    sender_name: str
    sender_email: str
    subject: str
    date_iso: str
    body_html: str
    body_text: str


def _decode_part(data: str) -> str:
    # Gmail returns URL-safe base64 with no padding.
    return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")


def _walk_parts(payload: dict) -> Iterator[dict]:
    yield payload
    for p in payload.get("parts", []) or []:
        yield from _walk_parts(p)


def _extract_body(payload: dict) -> tuple[str, str]:
    """Return (html, text). Prefer text/html; fall back to text/plain."""
    html = ""
    text = ""
    for part in _walk_parts(payload):
        mime = part.get("mimeType", "")
        data = (part.get("body") or {}).get("data")
        if not data:
            continue
        decoded = _decode_part(data)
        if mime == "text/html" and not html:
            html = decoded
        elif mime == "text/plain" and not text:
            text = decoded
    return html, text


def _header(headers: list[dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _parse_from(from_header: str) -> tuple[str, str]:
    """Parse "Name <email@x.com>" → ("Name", "email@x.com")."""
    if "<" in from_header and ">" in from_header:
        name = from_header.split("<", 1)[0].strip().strip('"')
        email = from_header.split("<", 1)[1].rsplit(">", 1)[0].strip()
        return name or email, email
    return from_header, from_header


def _date_to_iso(date_header: str) -> str:
    """RFC 2822 → ISO 8601 UTC."""
    from email.utils import parsedate_to_datetime
    try:
        dt = parsedate_to_datetime(date_header)
    except Exception:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def fetch_recent(
    creds: Credentials,
    gmail_query: str,
    max_results: int = 50,
) -> list[Message]:
    """Run a Gmail search, return a list of parsed Message objects."""
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    resp = (
        service.users()
        .messages()
        .list(userId="me", q=gmail_query, maxResults=max_results)
        .execute()
    )
    out: list[Message] = []
    for m in resp.get("messages", []):
        full = (
            service.users()
            .messages()
            .get(userId="me", id=m["id"], format="full")
            .execute()
        )
        payload = full.get("payload", {})
        headers = payload.get("headers", [])
        from_name, from_email = _parse_from(_header(headers, "From"))
        subject = _header(headers, "Subject")
        date_iso = _date_to_iso(_header(headers, "Date"))
        html, text = _extract_body(payload)
        out.append(
            Message(
                gmail_id=m["id"],
                sender_name=from_name,
                sender_email=from_email,
                subject=subject,
                date_iso=date_iso,
                body_html=html,
                body_text=text,
            )
        )
    return out


def snippet_from(text: str, limit: int = 280) -> str:
    text = " ".join((text or "").split())
    return text[:limit] + ("…" if len(text) > limit else "")
