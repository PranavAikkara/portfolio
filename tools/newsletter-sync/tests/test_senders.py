from pathlib import Path

import pytest

from app.senders import SenderStore, Sender


def test_load_from_empty_path(tmp_path: Path) -> None:
    path = tmp_path / "senders.json"
    store = SenderStore(path)
    assert store.all() == []


def test_add_sender_persists(tmp_path: Path) -> None:
    path = tmp_path / "senders.json"
    store = SenderStore(path)
    store.add("newsletter@openai.com", display_name="OpenAI")
    reloaded = SenderStore(path)
    assert len(reloaded.all()) == 1
    assert reloaded.all()[0].value == "newsletter@openai.com"
    assert reloaded.all()[0].display_name == "OpenAI"


def test_add_domain_sender(tmp_path: Path) -> None:
    store = SenderStore(tmp_path / "s.json")
    store.add("@anthropic.com", display_name="Anthropic")
    assert store.all()[0].value == "@anthropic.com"
    assert store.all()[0].is_domain is True


def test_remove_sender(tmp_path: Path) -> None:
    store = SenderStore(tmp_path / "s.json")
    store.add("a@x.com")
    store.add("b@y.com")
    store.remove("a@x.com")
    assert {s.value for s in store.all()} == {"b@y.com"}


def test_duplicate_add_is_noop(tmp_path: Path) -> None:
    store = SenderStore(tmp_path / "s.json")
    store.add("a@x.com")
    store.add("a@x.com")
    assert len(store.all()) == 1


def test_gmail_query_for_email(tmp_path: Path) -> None:
    s = Sender(value="a@x.com")
    assert s.gmail_query() == "from:a@x.com"


def test_gmail_query_for_domain(tmp_path: Path) -> None:
    s = Sender(value="@anthropic.com")
    assert s.gmail_query() == "from:anthropic.com"


def test_rejects_empty_value(tmp_path: Path) -> None:
    store = SenderStore(tmp_path / "s.json")
    with pytest.raises(ValueError):
        store.add("")
    with pytest.raises(ValueError):
        store.add("   ")
