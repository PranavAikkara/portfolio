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
export function resolveNodes(tree, ids) {
  const byId = new Map();
  const walk = nodes => {
    for (const n of nodes) {
      if (n.content != null) byId.set(n.id, n);
      if (n.children) walk(n.children);
    }
  };
  walk(tree.nodes);
  return ids.map(id => byId.get(id)).filter(Boolean);
}
