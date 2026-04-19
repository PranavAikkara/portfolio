"""Sender allowlist persistence.

Storage format (one file, committed to portfolio repo):

    [
      { "value": "newsletter@openai.com", "display_name": "OpenAI" },
      { "value": "@anthropic.com", "display_name": "Anthropic" }
    ]
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path


@dataclass
class Sender:
    value: str
    display_name: str | None = None

    @property
    def is_domain(self) -> bool:
        return self.value.startswith("@")

    def gmail_query(self) -> str:
        if self.is_domain:
            return f"from:{self.value.lstrip('@')}"
        return f"from:{self.value}"


@dataclass
class SenderStore:
    path: Path
    _items: list[Sender] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.path.exists():
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            self._items = [Sender(**e) for e in raw]

    def all(self) -> list[Sender]:
        return list(self._items)

    def add(self, value: str, display_name: str | None = None) -> None:
        v = (value or "").strip()
        if not v:
            raise ValueError("sender value cannot be empty")
        if any(s.value == v for s in self._items):
            return
        self._items.append(Sender(value=v, display_name=display_name))
        self._save()

    def remove(self, value: str) -> None:
        self._items = [s for s in self._items if s.value != value]
        self._save()

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps([asdict(s) for s in self._items], indent=2),
            encoding="utf-8",
        )
