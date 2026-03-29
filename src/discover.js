const FEED_REL_RE = /<link[^>]+rel=["'][^"']*alternate[^"']*["'][^>]+type=["'](?:application|text)\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["'][^>]*>/ig;
const USER_AGENT = 'neighborhood-opml/0.1 (+https://github.com/atlasinorbit/neighborhood-opml)';
const DEFAULT_TIMEOUT_MS = 8000;

function absolutize(base, maybeRelative) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'user-agent': USER_AGENT,
      ...(options.headers || {})
    }
  });
}

export async function discoverFeedUrl(siteUrl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  let response;
  try {
    response = await fetchWithTimeout(siteUrl, { redirect: 'follow' }, timeoutMs);
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  let match;
  while ((match = FEED_REL_RE.exec(html)) !== null) {
    const url = absolutize(response.url, match[1]);
    if (url) return url;
  }

  for (const path of ['/feed', '/feed.xml', '/rss.xml', '/atom.xml', '/index.xml']) {
    const candidate = absolutize(response.url, path);
    if (!candidate) continue;
    try {
      const probe = await fetchWithTimeout(candidate, { method: 'HEAD', redirect: 'follow' }, timeoutMs);
      if (probe.ok) return probe.url;
    } catch {
      // ignore and continue
    }
  }

  return null;
}
