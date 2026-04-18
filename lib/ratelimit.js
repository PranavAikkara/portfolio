export const LIMIT = 15;
export const COOKIE_NAME = 'pp_chat_count';

export function todayYmd(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function parseCookie(header) {
  if (!header) return null;
  const parts = header.split(/;\s+/);
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k !== COOKIE_NAME || !v) continue;
    const [countStr, date] = v.split('|');
    const count = Number(countStr);
    if (!Number.isFinite(count) || !/^\d{8}$/.test(date || '')) return null;
    return { count, date };
  }
  return null;
}

export function nextCookieValue(current, today) {
  let count;
  if (!current || current.date !== today) {
    count = 1;
  } else if (current.count >= LIMIT) {
    return {
      allowed: false,
      count: current.count,
      cookie: buildCookie(current.count, today),
    };
  } else {
    count = current.count + 1;
  }
  return { allowed: true, count, cookie: buildCookie(count, today) };
}

function buildCookie(count, date) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${count}|${date}; Path=/; Max-Age=86400; SameSite=Lax${secure}`;
}
