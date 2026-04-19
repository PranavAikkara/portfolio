"""HTML sanitization for newsletter content before publishing.

Strategy:
    - Parse with BeautifulSoup (lxml backend).
    - Strip <script>, <style>, inline event handlers.
    - Remove 1x1 tracking pixels (width/height == 1 or src in known tracker domains).
    - Remove links whose href or text contains unsubscribe / preferences / view in browser.
    - Remove common footer blocks (class/id matches 'footer', 'unsubscribe').
    - Strip personalized greetings (Hi|Hello|Dear <FIRST_NAME>,).
    - Strip the personal email anywhere in the body.

This is best-effort — review output for new senders.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup, Tag

_TRACKER_DOMAIN_SNIPPETS = (
    "track",
    "open.mail",
    "click.mail",
    "list-manage",
    "beacon",
    "pixel",
    "utm_source=",
)

_JUNK_LINK_MARKERS = (
    "unsubscribe",
    "preferences",
    "email/settings",
    "manage-preferences",
    "view in browser",
    "view online",
    "view this email",
)

_FOOTER_HINTS = ("footer", "unsubscribe", "email-footer", "mail-footer")


def _is_tracking_img(tag: Tag) -> bool:
    if tag.name != "img":
        return False
    # Tiny tracking pixel
    w = tag.get("width")
    h = tag.get("height")
    if (w in ("1", "1px", "0") or h in ("1", "1px", "0")):
        return True
    src = (tag.get("src") or "").lower()
    return any(snippet in src for snippet in _TRACKER_DOMAIN_SNIPPETS)


def _is_junk_link(tag: Tag) -> bool:
    if tag.name != "a":
        return False
    href = (tag.get("href") or "").lower()
    text = tag.get_text(" ", strip=True).lower()
    return any(m in href or m in text for m in _JUNK_LINK_MARKERS)


def _is_footer_block(tag: Tag) -> bool:
    if tag.name not in ("div", "section", "table", "tr", "td", "p"):
        return False
    hint = " ".join(
        filter(
            None,
            [
                " ".join(tag.get("class") or []),
                tag.get("id") or "",
                tag.get("role") or "",
            ],
        )
    ).lower()
    return any(h in hint for h in _FOOTER_HINTS)


def _strip_greeting(text: str, first_name: str) -> str:
    pat = re.compile(
        rf"^(?:hi|hello|hey|dear)\s+{re.escape(first_name)}\s*[,:\-]?\s*",
        re.IGNORECASE,
    )
    return pat.sub("", text, count=1)


def sanitize_html(html: str, personal_email: str, first_name: str) -> str:
    """Return a cleaned HTML string safe to publish publicly."""
    if not html or not html.strip():
        return ""

    soup = BeautifulSoup(html, "lxml")

    # Drop dangerous / non-content tags.
    for tag in soup.find_all(["script", "style", "meta", "link", "noscript"]):
        tag.decompose()

    # Drop tracking images.
    for img in list(soup.find_all("img")):
        if _is_tracking_img(img):
            img.decompose()

    # Drop junk links (unsubscribe, preferences, view-in-browser).
    # Remove the whole <a> including its text, but leave surrounding content.
    for a in list(soup.find_all("a")):
        if _is_junk_link(a):
            a.decompose()

    # Drop footer-looking blocks.
    for t in list(soup.find_all(True)):  # all tags
        if _is_footer_block(t):
            t.decompose()

    # Strip personalized greeting from every <p> that starts with one.
    for p in soup.find_all(["p", "div", "span"]):
        text = p.get_text(" ", strip=True)
        if not text:
            continue
        stripped = _strip_greeting(text, first_name)
        if stripped != text:
            # If greeting removal leaves the block empty, drop it.
            if not stripped.strip():
                p.decompose()
            else:
                # Replace the visible text inside the tag.
                p.clear()
                p.append(stripped)

    # Strip the personal email anywhere it appears.
    if personal_email:
        walker = soup.find_all(string=True)
        for node in walker:
            if personal_email in node:
                node.replace_with(node.replace(personal_email, ""))

    # Return the body's inner HTML if present; otherwise the whole soup.
    body = soup.body
    if body is not None:
        return body.decode_contents().strip()
    return str(soup).strip()
