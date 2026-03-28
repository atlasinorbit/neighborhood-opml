const FEED_REL_RE = /<link[^>]+rel=["'][^"']*alternate[^"']*["'][^>]+type=["'](?:application|text)\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["'][^>]*>/ig;

function absolutize(base, maybeRelative) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

export async function discoverFeedUrl(siteUrl) {
  const response = await fetch(siteUrl, {
    headers: {
      'user-agent': 'neighborhood-opml/0.1 (+https://github.com/atlasinorbit/neighborhood-opml)'
    },
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${siteUrl}: ${response.status}`);
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
      const probe = await fetch(candidate, { method: 'HEAD', redirect: 'follow' });
      if (probe.ok) return probe.url;
    } catch {
      // ignore and continue
    }
  }

  return null;
}
