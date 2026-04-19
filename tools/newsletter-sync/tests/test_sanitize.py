from app.sanitize import sanitize_html


PERSONAL = "aikkara.pranav@gmail.com"
NAME = "Pranav"


def clean(html: str) -> str:
    return sanitize_html(html, PERSONAL, NAME)


def test_removes_1x1_tracking_pixel() -> None:
    html = '<p>hi</p><img src="https://track.io/p.gif" width="1" height="1" />'
    out = clean(html)
    assert "<img" not in out
    assert "<p>hi</p>" in out


def test_keeps_content_images() -> None:
    html = '<img src="https://cdn.example.com/cover.jpg" alt="cover" width="600">'
    out = clean(html)
    assert "<img" in out
    assert "cover.jpg" in out


def test_removes_unsubscribe_link() -> None:
    html = '<p><a href="https://x.com/unsubscribe?id=abc">unsubscribe</a></p>'
    out = clean(html)
    assert "unsubscribe" not in out.lower()


def test_removes_email_preferences_link() -> None:
    html = '<p><a href="https://x.com/email/preferences">manage preferences</a></p>'
    out = clean(html)
    assert "preferences" not in out.lower()


def test_removes_personalized_greeting_hi() -> None:
    html = "<p>Hi Pranav,</p><p>Welcome.</p>"
    out = clean(html)
    assert "Pranav" not in out
    assert "Welcome." in out


def test_removes_personalized_greeting_hello() -> None:
    html = "<p>Hello Pranav,</p><p>Welcome.</p>"
    out = clean(html)
    assert "Pranav" not in out


def test_removes_personalized_greeting_dear() -> None:
    html = "<p>Dear Pranav,</p><p>Welcome.</p>"
    out = clean(html)
    assert "Pranav" not in out


def test_strips_personal_email_anywhere() -> None:
    html = f"<p>You, {PERSONAL}, are subscribed.</p>"
    out = clean(html)
    assert PERSONAL not in out


def test_removes_view_in_browser_link() -> None:
    html = '<p><a href="https://x.com/view?id=abc">View in browser</a></p>'
    out = clean(html)
    assert "view in browser" not in out.lower()


def test_removes_footer_block_by_class() -> None:
    html = """
    <p>Body.</p>
    <div class="footer">
      <a href="https://x.com/unsub">unsubscribe</a>
      <p>Sender LLC, 123 Main St.</p>
    </div>
    """
    out = clean(html)
    assert "Body." in out
    assert "footer" not in out
    assert "Sender LLC" not in out


def test_preserves_headings_and_paragraphs() -> None:
    html = "<h1>Title</h1><h2>Sub</h2><p>Body.</p><ul><li>a</li><li>b</li></ul>"
    out = clean(html)
    assert "<h1>Title</h1>" in out
    assert "<h2>Sub</h2>" in out
    assert "<p>Body.</p>" in out
    assert "<li>a</li>" in out


def test_removes_script_tags_defensively() -> None:
    html = '<p>Hi.</p><script>alert(1)</script>'
    out = clean(html)
    assert "<script" not in out
    assert "<p>Hi.</p>" in out


def test_removes_style_tags() -> None:
    html = '<style>.a{color:red}</style><p>Hi.</p>'
    out = clean(html)
    assert "<style" not in out


def test_empty_input_returns_empty_string() -> None:
    assert clean("") == ""
    assert clean("   ") == ""


def test_no_dom_returns_cleaned_text() -> None:
    # Plain text through the sanitizer — returned wrapped or stripped, doesn't crash.
    out = clean("just some text")
    assert "just some text" in out
