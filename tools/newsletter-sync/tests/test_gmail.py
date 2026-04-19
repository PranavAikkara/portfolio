from app.gmail import _parse_from, _decode_part, _date_to_iso, snippet_from
import base64


def test_parse_from_with_name() -> None:
    assert _parse_from('"OpenAI" <newsletter@openai.com>') == ("OpenAI", "newsletter@openai.com")


def test_parse_from_without_name() -> None:
    assert _parse_from("x@y.com") == ("x@y.com", "x@y.com")


def test_decode_part_urlsafe_base64() -> None:
    raw = "hello world"
    encoded = base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")
    assert _decode_part(encoded) == raw


def test_date_to_iso_rfc2822() -> None:
    out = _date_to_iso("Sun, 19 Apr 2026 08:32:00 +0000")
    assert out == "2026-04-19T08:32:00Z"


def test_snippet_truncates_and_collapses_whitespace() -> None:
    text = "  line one\n\n\nline   two   " + ("x" * 400)
    out = snippet_from(text, limit=50)
    assert len(out) <= 51  # +1 for ellipsis
    assert out.endswith("…")
