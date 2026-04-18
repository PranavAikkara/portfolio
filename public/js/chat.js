(() => {
  const input = document.getElementById('ask-input');
  const submit = document.getElementById('ask-submit');
  const thread = document.getElementById('chat-thread');
  if (!input || !submit || !thread) return;

  const state = { messages: [], streaming: false, limited: false };

  // Wire starter pills.
  document.querySelectorAll('.pill[data-question]').forEach(pill => {
    pill.addEventListener('click', () => {
      input.value = pill.dataset.question;
      send();
    });
  });

  submit.addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  async function send() {
    const text = input.value.trim();
    if (!text || state.streaming || state.limited) return;

    // User turn
    state.messages.push({ role: 'user', content: text });
    input.value = '';
    appendUser(text);
    state.streaming = true;
    submit.disabled = true;

    // Placeholders for this turn
    const reasoning = appendReasoningPlaceholder();
    const assistant = appendAssistantPlaceholder();
    let assistantText = '';

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: state.messages.slice(-4) }),
      });

      if (resp.status === 429) {
        const data = await resp.json().catch(() => ({}));
        assistant.innerHTML = '';
        const p = document.createElement('span');
        p.className = 'chat-limit';
        p.innerHTML = (data.message || "we've been talking a lot today — ping me at <a href='mailto:aikkara.pranav@gmail.com'>aikkara.pranav@gmail.com</a> for the rest.")
          .replace(
            /aikkara\.pranav@gmail\.com/g,
            "<a href='mailto:aikkara.pranav@gmail.com'>aikkara.pranav@gmail.com</a>"
          );
        assistant.appendChild(p);
        reasoning.remove();
        state.limited = true;
        input.disabled = true;
        submit.disabled = true;
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const line of parts) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }
          handleEvent(event, { reasoning, assistant, getText: () => assistantText, setText: v => { assistantText = v; } });
        }
      }
      state.messages.push({ role: 'assistant', content: assistantText });
    } catch (err) {
      assistant.textContent = "my brain hiccupped — refresh and try again.";
      assistant.classList.add('chat-error');
    } finally {
      // Remove streaming cursor if any
      assistant.querySelector('.cursor')?.remove();
      state.streaming = false;
      submit.disabled = state.limited;
    }
  }

  function handleEvent(event, ctx) {
    const { reasoning, assistant } = ctx;
    switch (event.type) {
      case 'thinking':
        setReasoningLabel(reasoning, 'searching knowledge tree…');
        break;
      case 'selected_nodes':
        renderReasoningNodes(reasoning, event.nodes || []);
        break;
      case 'answering':
        assistant.innerHTML = '<span class="cursor"></span>';
        break;
      case 'token': {
        const cursor = assistant.querySelector('.cursor');
        const before = ctx.getText();
        const next = before + event.text;
        ctx.setText(next);
        assistant.textContent = next;
        if (cursor) {
          const c = document.createElement('span');
          c.className = 'cursor';
          assistant.appendChild(c);
        }
        break;
      }
      case 'error':
        assistant.textContent = event.message || 'something went wrong.';
        assistant.classList.add('chat-error');
        break;
      case 'done':
        /* nothing; finally-block removes cursor */
        break;
    }
  }

  function appendUser(text) {
    const el = document.createElement('div');
    el.className = 'turn-user';
    el.textContent = text;
    thread.appendChild(el);
    return el;
  }
  function appendReasoningPlaceholder() {
    const details = document.createElement('details');
    details.className = 'reasoning';
    details.innerHTML = `<summary style="list-style:none">
      <button type="button"><span class="chev">▸</span><span class="label">routing…</span></button>
    </summary><div class="nodes"></div>`;
    thread.appendChild(details);
    return details;
  }
  function setReasoningLabel(details, label) {
    const span = details.querySelector('.label');
    if (span) span.textContent = label;
  }
  function renderReasoningNodes(details, nodes) {
    const label = details.querySelector('.label');
    const body = details.querySelector('.nodes');
    body.innerHTML = '';
    if (nodes.length === 0) {
      if (label) label.textContent = 'no matching section — answering from memory';
      return;
    }
    if (label) label.textContent = `routed through ${nodes.length} section${nodes.length > 1 ? 's' : ''}`;
    for (const n of nodes) {
      const row = document.createElement('div');
      row.textContent = '§ ' + n.path.join(' › ');
      body.appendChild(row);
    }
  }
  function appendAssistantPlaceholder() {
    const el = document.createElement('div');
    el.className = 'turn-assistant';
    el.innerHTML = '<span class="cursor"></span>';
    thread.appendChild(el);
    return el;
  }

  // Floating FAB → focus the hero input
  document.querySelector('.chat-fab')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => input.focus(), 500);
  });
})();
