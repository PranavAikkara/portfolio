/**
 * Flatten every node (internal + leaf) for the router prompt.
 * Returns [{ id, title, summary, path }].
 */
export function buildToc(tree) {
  const out = [];
  const walk = nodes => {
    for (const n of nodes) {
      out.push({ id: n.id, title: n.title, summary: n.summary, path: n.path });
      if (n.children) walk(n.children);
    }
  };
  walk(tree.nodes);
  return out;
}

/**
 * Return only leaves (nodes with content) whose IDs match the given list,
 * in the order requested. Unknown IDs silently skipped.
 */
export const MAX_LEAVES = 8;

// Turn router-selected ids into content nodes. A leaf resolves to itself; an
// internal node (a section the router picked instead of its leaves) expands to
// its leaf descendants in document order. Capped so one top-level pick can't
// flood the context, and a leaf is never included twice.
export function resolveNodes(tree, ids, limit = MAX_LEAVES) {
  const byId = new Map();
  const walk = nodes => {
    for (const n of nodes) {
      byId.set(n.id, n);
      if (n.children) walk(n.children);
    }
  };
  walk(tree.nodes);

  const leavesUnder = n =>
    n.content != null ? [n] : (n.children ?? []).flatMap(leavesUnder);

  const out = [];
  const seen = new Set();
  for (const id of ids) {
    const node = byId.get(id);
    if (!node) continue;
    for (const leaf of leavesUnder(node)) {
      if (out.length >= limit) return out;
      if (seen.has(leaf.id)) continue;
      seen.add(leaf.id);
      out.push(leaf);
    }
  }
  return out;
}
