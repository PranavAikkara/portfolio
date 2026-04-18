// Deterministic markdown → tree parser.
// No network, no LLM — hierarchy comes from heading structure.

export function slugify(parts) {
  return parts
    .map(p =>
      p
        .toLowerCase()
        .replace(/[\u2014\u2013]/g, '-')  // em/en dash
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )
    .join('.');
}

import { marked } from 'marked';

/**
 * Parse one markdown string into a nested tree.
 * H1 = root, H2 = child, H3 = leaf. Content under H3 is the leaf payload.
 * A line starting with "> " immediately after a heading is that node's summary.
 */
export function parseMarkdownFile(md) {
  const tokens = marked.lexer(md);
  const stack = []; // stack of { node, depth }
  let root = null;
  let pendingContent = []; // content tokens collected under the current leaf

  const flushContent = () => {
    if (stack.length === 0 || pendingContent.length === 0) {
      pendingContent = [];
      return;
    }
    const top = stack[stack.length - 1].node;
    const text = pendingContent
      .map(t => (t.raw ?? '').trim())
      .filter(Boolean)
      .join('\n\n')
      .trim();
    if (text) top.content = (top.content ? top.content + '\n\n' : '') + text;
    pendingContent = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok.type === 'heading' && tok.depth >= 1 && tok.depth <= 3) {
      flushContent();
      // Pop stack to parent depth
      while (stack.length && stack[stack.length - 1].depth >= tok.depth) stack.pop();

      const parentPath = stack.length ? stack[stack.length - 1].node.path : [];
      const path = [...parentPath, tok.text];
      const node = { id: slugify(path), title: tok.text, path };

      // Summary: next token must be a blockquote starting with "> "
      const next = tokens[i + 1];
      if (next && next.type === 'blockquote') {
        node.summary = next.text.trim();
        i++;
      }

      if (stack.length) {
        const parent = stack[stack.length - 1].node;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        root = node;
      }
      stack.push({ node, depth: tok.depth });
    } else {
      pendingContent.push(tok);
    }
  }
  flushContent();

  // Leaves should not have an empty children array.
  const cleanLeaves = n => {
    if (n.children) n.children.forEach(cleanLeaves);
    if (n.children && n.children.length === 0) delete n.children;
  };
  if (root) cleanLeaves(root);
  return root;
}

export function buildTree(files) {
  const nodes = files
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(f => parseMarkdownFile(f.content))
    .filter(Boolean);
  return {
    generated_at: new Date().toISOString(),
    nodes,
  };
}
