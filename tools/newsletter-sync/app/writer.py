"""Write synced newsletters into the portfolio repo.

- Slug = <ISO date>-<slug(sender)>-<slug(subject)>
- <slug>.json holds the full entry.
- index.json holds a metadata-only array (no body), newest-first.
- Dedupe by gmail_id against index.json.
- Optionally run git add/commit/push against the repo root.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from slugify import slugify as _slugify_lib

INDEX_NAME = "index.json"

META_KEYS = ("slug", "subject", "sender_name", "date", "snippet")


def slugify(date_iso: str, sender_name: str, subject: str) -> str:
    date_part = date_iso[:10]  # YYYY-MM-DD
    sender = _slugify_lib(sender_name, max_length=32) or "sender"
    subj = _slugify_lib(subject, max_length=80)
    if subj:
        return f"{date_part}-{sender}-{subj}"
    return f"{date_part}-{sender}"


def _load_index(content_dir: Path) -> list[dict]:
    path = content_dir / INDEX_NAME
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _save_index(content_dir: Path, index: list[dict]) -> None:
    index.sort(key=lambda e: e.get("date", ""), reverse=True)
    (content_dir / INDEX_NAME).write_text(
        json.dumps(index, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def write_newsletter(content_dir: Path, entry: dict) -> bool:
    """Write one newsletter. Returns False if this gmail_id is already in the index."""
    index = _load_index(content_dir)

    gmail_id = entry.get("gmail_id")
    if gmail_id and any(e.get("_gmail_id") == gmail_id for e in index):
        return False

    detail_path = content_dir / f"{entry['slug']}.json"
    detail_path.write_text(
        json.dumps(entry, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    meta = {k: entry.get(k) for k in META_KEYS}
    meta["_gmail_id"] = gmail_id  # internal dedupe key
    index.append(meta)
    _save_index(content_dir, index)
    return True


def commit_and_push(repo_path: Path, count: int) -> bool:
    """Run git add / commit / push for the newsletter content dir.

    Returns True if push succeeded, False if commit succeeded but push failed
    (no remote, auth error, etc.). The local commit remains in either case.
    """
    if count <= 0:
        return True
    rel = Path("content") / "newsletters"
    subprocess.run(["git", "-C", str(repo_path), "add", str(rel)], check=True)
    # commit may also be a no-op if nothing staged changed; ignore that case.
    commit = subprocess.run(
        ["git", "-C", str(repo_path), "commit", "-m", f"sync: {count} newsletter{'s' if count != 1 else ''}"],
        capture_output=True,
        text=True,
    )
    if commit.returncode != 0 and "nothing to commit" not in (commit.stdout + commit.stderr):
        raise subprocess.CalledProcessError(commit.returncode, commit.args, commit.stdout, commit.stderr)

    push = subprocess.run(
        ["git", "-C", str(repo_path), "push"],
        capture_output=True,
        text=True,
    )
    if push.returncode != 0:
        print(f"[commit_and_push] push skipped: {push.stderr.strip()}")
        return False
    return True
