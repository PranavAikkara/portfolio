"""FastAPI entry — dashboard, auth, senders, sync."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app import gmail as gmail_mod
from app import oauth
from app import sanitize
from app import writer
from app.config import settings
from app.senders import SenderStore

app = FastAPI(title="newsletter-sync")
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


def _store() -> SenderStore:
    return SenderStore(settings.senders_path)


def _read_last_sync() -> str | None:
    p = settings.last_sync_path
    if not p.exists():
        return None
    return json.loads(p.read_text()).get("last_sync")


def _write_last_sync(iso: str) -> None:
    settings.last_sync_path.parent.mkdir(parents=True, exist_ok=True)
    settings.last_sync_path.write_text(json.dumps({"last_sync": iso}))


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "authed": oauth.is_authorized(settings.token_path),
            "last_sync": _read_last_sync(),
            "sender_count": len(_store().all()),
        },
    )


@app.get("/auth")
def auth() -> RedirectResponse:
    oauth.get_credentials(
        settings.token_path,
        settings.GOOGLE_CLIENT_ID,
        settings.GOOGLE_CLIENT_SECRET,
    )
    return RedirectResponse("/", status_code=303)


@app.get("/senders", response_class=HTMLResponse)
def senders_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "senders.html",
        {"senders": _store().all()},
    )


@app.post("/senders/add")
def senders_add(value: str = Form(...), display_name: str = Form("")) -> RedirectResponse:
    _store().add(value, display_name=display_name or None)
    return RedirectResponse("/senders", status_code=303)


@app.post("/senders/remove")
def senders_remove(value: str = Form(...)) -> RedirectResponse:
    _store().remove(value)
    return RedirectResponse("/senders", status_code=303)


@app.post("/sync", response_class=HTMLResponse)
def sync(request: Request) -> HTMLResponse:
    creds = oauth.get_credentials(
        settings.token_path,
        settings.GOOGLE_CLIENT_ID,
        settings.GOOGLE_CLIENT_SECRET,
    )

    # Cutoff = last sync OR 30 days ago on first run.
    last = _read_last_sync()
    cutoff_dt = (
        datetime.fromisoformat(last.replace("Z", "+00:00"))
        if last
        else datetime.now(timezone.utc) - timedelta(days=settings.FIRST_SYNC_WINDOW_DAYS)
    )

    # Gmail search uses a date (YYYY/M/D), not ISO.
    cutoff_str = cutoff_dt.strftime("%Y/%m/%d")

    store = _store()
    settings.content_dir.mkdir(parents=True, exist_ok=True)

    written = 0
    for s in store.all():
        q = f"{s.gmail_query()} after:{cutoff_str}"
        for msg in gmail_mod.fetch_recent(creds, q):
            clean_html = sanitize.sanitize_html(
                msg.body_html or f"<p>{msg.body_text}</p>",
                settings.PERSONAL_EMAIL,
                settings.PERSONAL_FIRST_NAME,
            )
            entry = {
                "slug": writer.slugify(msg.date_iso, msg.sender_name, msg.subject),
                "subject": msg.subject,
                "sender_name": msg.sender_name or (s.display_name or s.value),
                "sender_email": msg.sender_email,
                "date": msg.date_iso,
                "snippet": gmail_mod.snippet_from(msg.body_text or clean_html, limit=280),
                "body_html": clean_html,
                "body_text": msg.body_text,
                "gmail_id": msg.gmail_id,
            }
            if writer.write_newsletter(settings.content_dir, entry):
                written += 1

    if written > 0:
        writer.commit_and_push(settings.PORTFOLIO_REPO_PATH, written)

    _write_last_sync(datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))

    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "authed": True,
            "last_sync": _read_last_sync(),
            "sender_count": len(store.all()),
            "flash": f"Synced {written} new newsletter{'s' if written != 1 else ''}.",
        },
    )
