import json
from pathlib import Path
from unittest.mock import patch

import pytest

from app.writer import slugify, write_newsletter


def test_slugify_format() -> None:
    slug = slugify("2026-04-19T08:32:00Z", "OpenAI", "The Future of Agents!")
    assert slug == "2026-04-19-openai-the-future-of-agents"


def test_slugify_empty_subject_falls_back_to_sender() -> None:
    slug = slugify("2026-04-19T08:32:00Z", "OpenAI", "")
    assert slug == "2026-04-19-openai"


def test_slugify_non_ascii_subject() -> None:
    slug = slugify("2026-04-19T00:00:00Z", "Anthropic", "日本語のテスト")
    # Should still produce a valid slug starting with the date.
    assert slug.startswith("2026-04-19-anthropic")


def test_write_newsletter_creates_files_and_updates_index(tmp_path: Path) -> None:
    content_dir = tmp_path / "content" / "newsletters"
    content_dir.mkdir(parents=True)

    entry = {
        "slug": "2026-04-19-openai-hello",
        "subject": "Hello",
        "sender_name": "OpenAI",
        "sender_email": "a@openai.com",
        "date": "2026-04-19T10:00:00Z",
        "snippet": "Hi there.",
        "body_html": "<p>Hello.</p>",
        "body_text": "Hello.",
        "gmail_id": "abc123",
    }

    created = write_newsletter(content_dir, entry)
    assert created is True

    detail_file = content_dir / "2026-04-19-openai-hello.json"
    index_file = content_dir / "index.json"
    assert detail_file.exists()
    assert index_file.exists()

    index = json.loads(index_file.read_text())
    assert len(index) == 1
    assert index[0]["slug"] == "2026-04-19-openai-hello"
    assert index[0]["sender_name"] == "OpenAI"


def test_write_newsletter_dedupes_by_gmail_id(tmp_path: Path) -> None:
    content_dir = tmp_path / "content" / "newsletters"
    content_dir.mkdir(parents=True)

    entry = {
        "slug": "s",
        "subject": "Hi",
        "sender_name": "X",
        "sender_email": "x@x.com",
        "date": "2026-04-19T00:00:00Z",
        "snippet": "",
        "body_html": "<p/>",
        "body_text": "",
        "gmail_id": "dup1",
    }

    assert write_newsletter(content_dir, entry) is True
    assert write_newsletter(content_dir, entry) is False  # dedupe


def test_write_newsletter_keeps_index_sorted_newest_first(tmp_path: Path) -> None:
    content_dir = tmp_path / "content" / "newsletters"
    content_dir.mkdir(parents=True)

    def mk(slug: str, date: str, gid: str) -> dict:
        return {
            "slug": slug, "subject": "S", "sender_name": "X", "sender_email": "x@x.com",
            "date": date, "snippet": "", "body_html": "<p/>", "body_text": "", "gmail_id": gid,
        }

    write_newsletter(content_dir, mk("a", "2026-04-10T00:00:00Z", "g1"))
    write_newsletter(content_dir, mk("b", "2026-04-19T00:00:00Z", "g2"))
    write_newsletter(content_dir, mk("c", "2026-04-15T00:00:00Z", "g3"))

    index = json.loads((content_dir / "index.json").read_text())
    assert [x["slug"] for x in index] == ["b", "c", "a"]  # newest first
