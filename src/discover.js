const LINK_TAG_RE = /<link\b[^>]*>/ig;
const ATTR_RE = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
const USER_AGENT = 'neighborhood-opml/0.1 (+https://github.com/atlasinorbit/neighborhood-opml)';
const DEFAULT_TIMEOUT_MS = 8000;

function absolutize(base, maybeRelative) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

function parseAttributes(tag) {
  const attributes = new Map();
  let match;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(tag)) !== null) {
    const [, rawName, doubleQuoted, singleQuoted, bareValue] = match;
    attributes.set(rawName.toLowerCase(), doubleQuoted ?? singleQuoted ?? bareValue ?? '');
  }
  return attributes;
}

function findLinkedTag(html, predicate) {
  let match;
  LINK_TAG_RE.lastIndex = 0;
  while ((match = LINK_TAG_RE.exec(html)) !== null) {
    const attrs = parseAttributes(match[0]);
    if (predicate(attrs)) {
      return attrs;
    }
  }
  return null;
}

function classifyFeedType(contentType = '') {
  const normalized = String(contentType).toLowerCase();
  if (normalized.includes('application/feed+json')) return 'json';
  if (normalized.includes('atom+xml')) return 'atom';
  if (normalized.includes('rss+xml')) return 'rss';
  return null;
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

async function fetchSiteHtml(siteUrl, timeoutMs) {
  let response;
  try {
    response = await fetchWithTimeout(siteUrl, { redirect: 'follow' }, timeoutMs);
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return {
    response,
    html: await response.text(),
  };
}

export async function discoverFeed(siteUrl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const fetched = await fetchSiteHtml(siteUrl, timeoutMs);
  if (!fetched) {
    return { feedUrl: null, feedType: null };
  }

  const { response, html } = fetched;
  const linkedFeed = findLinkedTag(html, (attrs) => {
    const rel = (attrs.get('rel') || '').toLowerCase().split(/\s+/).filter(Boolean);
    const type = (attrs.get('type') || '').toLowerCase();
    return rel.includes('alternate') && (
      type === 'application/rss+xml' ||
      type === 'text/rss+xml' ||
      type === 'application/atom+xml' ||
      type === 'text/atom+xml' ||
      type === 'application/feed+json'
    ) && attrs.has('href');
  });

  if (linkedFeed) {
    return {
      feedUrl: absolutize(response.url, linkedFeed.get('href')),
      feedType: classifyFeedType(linkedFeed.get('type')) || 'rss',
    };
  }

  for (const path of ['/feed', '/feed.xml', '/rss.xml', '/atom.xml', '/feed.json', '/index.xml']) {
    const candidate = absolutize(response.url, path);
    if (!candidate) continue;
    try {
      const probe = await fetchWithTimeout(candidate, { method: 'HEAD', redirect: 'follow' }, timeoutMs);
      if (probe.ok) {
        const feedType = classifyFeedType(probe.headers?.get?.('content-type'))
          || (candidate.endsWith('.json') ? 'json' : candidate.includes('atom') ? 'atom' : 'rss');
        return { feedUrl: probe.url, feedType };
      }
    } catch {
      // ignore and continue
    }
  }

  return { feedUrl: null, feedType: null };
}

export async function discoverFeedUrl(siteUrl, options) {
  return (await discoverFeed(siteUrl, options)).feedUrl;
}

export async function discoverBlogrollUrl(siteUrl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const fetched = await fetchSiteHtml(siteUrl, timeoutMs);
  if (!fetched) {
    return null;
  }

  const { response, html } = fetched;
  const linkedBlogroll = findLinkedTag(html, (attrs) => {
    const rel = (attrs.get('rel') || '').toLowerCase().split(/\s+/).filter(Boolean);
    return rel.includes('blogroll') && attrs.has('href');
  });

  if (linkedBlogroll) {
    const url = absolutize(response.url, linkedBlogroll.get('href'));
    if (url) return url;
  }

  for (const path of ['/blogroll.opml', '/recommendations.opml', '/.well-known/recommendations.opml']) {
    const fallback = absolutize(response.url, path);
    if (!fallback) continue;

    try {
      const probe = await fetchWithTimeout(fallback, { method: 'HEAD', redirect: 'follow', headers: { accept: 'text/x-opml, application/xml, text/xml' } }, timeoutMs);
      if (probe.ok) return probe.url;
    } catch {
      // ignore
    }
  }

  return null;
}

export async function discoverHumanJsonUrl(siteUrl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const fetched = await fetchSiteHtml(siteUrl, timeoutMs);
  if (!fetched) {
    return null;
  }

  const { response, html } = fetched;
  const linkedHumanJson = findLinkedTag(html, (attrs) => {
    const rel = (attrs.get('rel') || '').toLowerCase().split(/\s+/).filter(Boolean);
    return rel.includes('human-json') && attrs.has('href');
  });

  if (linkedHumanJson) {
    const url = absolutize(response.url, linkedHumanJson.get('href'));
    if (url) return url;
  }

  const fallback = absolutize(response.url, '/human.json');
  if (!fallback) return null;

  try {
    const probe = await fetchWithTimeout(fallback, { method: 'HEAD', redirect: 'follow', headers: { accept: 'application/json' } }, timeoutMs);
    if (probe.ok) return probe.url;
  } catch {
    // ignore
  }

  return null;
}
