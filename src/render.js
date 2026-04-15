function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function escapeHtml(value = '') {
  return escapeXml(value);
}

function slugifyTag(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

export function normalizeSites(rawSites) {
  if (!Array.isArray(rawSites)) {
    throw new Error('Input file must contain a JSON array of site entries.');
  }

  return rawSites.map((site, index) => {
    if (!site || typeof site !== 'object') {
      throw new Error(`Site entry at index ${index} must be an object.`);
    }

    if (!site.title || !site.url) {
      throw new Error(`Site entry at index ${index} must include title and url.`);
    }

    const human = site.human && typeof site.human === 'object'
      ? {
          vouch: site.human.vouch !== undefined ? Boolean(site.human.vouch) : undefined,
          vouchedAt: site.human.vouchedAt ? String(site.human.vouchedAt) : undefined,
        }
      : null;

    return {
      title: String(site.title),
      url: String(site.url),
      feedUrl: site.feedUrl ? String(site.feedUrl) : null,
      humanJsonUrl: site.humanJsonUrl ? String(site.humanJsonUrl) : null,
      tags: Array.isArray(site.tags) ? site.tags.map(String) : [],
      notes: site.notes ? String(site.notes) : '',
      human,
    };
  });
}

export function renderOpml({ title, sites }) {
  const outlines = sites
    .filter((site) => site.feedUrl)
    .map((site) => `    <outline text="${escapeXml(site.title)}" title="${escapeXml(site.title)}" type="rss" xmlUrl="${escapeXml(site.feedUrl)}" htmlUrl="${escapeXml(site.url)}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(title)}</title>
  </head>
  <body>
${outlines}
  </body>
</opml>
`;
}

export function renderHtml({ title, sites, generatedAt = new Date().toISOString(), includeHumanJson = false }) {
  const withFeeds = sites.filter((site) => site.feedUrl).length;
  const withHumanJson = sites.filter((site) => site.humanJsonUrl).length;
  const draftVouchCount = includeHumanJson
    ? sites.filter((site) => site.human?.vouch !== false).length
    : 0;

  const tagCounts = new Map();
  for (const site of sites) {
    for (const tag of site.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const browseTags = Array.from(tagCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({
      tag,
      count,
      slug: slugifyTag(tag),
    }));

  const items = sites.map((site) => {
    const tags = site.tags.length
      ? `<ul class="tags">${site.tags.map((tag) => `<li><a href="#tag-${escapeHtml(slugifyTag(tag))}">${escapeHtml(tag)}</a></li>`).join('')}</ul>`
      : '';
    const feed = site.feedUrl
      ? `<a class="feed" href="${escapeHtml(site.feedUrl)}">feed ↗</a>`
      : '<span class="feed missing">feed missing</span>';
    const notes = site.notes ? `<p>${escapeHtml(site.notes)}</p>` : '';
    const humanJson = site.humanJsonUrl
      ? `<a class="human-json" href="${escapeHtml(site.humanJsonUrl)}">publishes human.json ↗</a>`
      : '';
    const draftVouch = includeHumanJson && site.human?.vouch !== false
      ? '<span class="vouch">included in draft vouch list</span>'
      : '';

    return `<li>
      <div class="row">
        <a class="title" href="${escapeHtml(site.url)}">${escapeHtml(site.title)}</a>
        <div class="signals">
          ${feed}
          ${humanJson}
          ${draftVouch}
        </div>
      </div>
      ${notes}
      ${tags}
    </li>`;
  }).join('\n');

  const stats = [
    `${sites.length} sites`,
    `${withFeeds} with feeds`,
    `${withHumanJson} publishing human.json`,
    includeHumanJson ? `${draftVouchCount} in draft vouch list` : null,
  ].filter(Boolean).map((value) => `<li>${escapeHtml(value)}</li>`).join('');

  const tagIndex = browseTags.length
    ? `<section class="browse" aria-labelledby="browse-by-tag">
        <h2 id="browse-by-tag">Browse by tag</h2>
        <ul class="tag-index">${browseTags.map(({ tag, count, slug }) => `<li id="tag-${escapeHtml(slug)}"><a href="#tag-${escapeHtml(slug)}">${escapeHtml(tag)}</a> <span>${count}</span></li>`).join('')}</ul>
      </section>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="blogroll" type="text/x-opml" title="${escapeHtml(title)}" href="./blogroll.opml" />
    <style>
      :root { color-scheme: dark light; }
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0b1020; color: #e6edf3; }
      main { max-width: 52rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
      h1 { margin-bottom: .5rem; }
      h2 { margin: 2rem 0 .75rem; font-size: 1rem; text-transform: uppercase; letter-spacing: .08em; opacity: .9; }
      p.meta { opacity: .72; margin-top: 0; }
      ul.sites { list-style: none; padding: 0; display: grid; gap: 1rem; }
      ul.sites > li { border: 1px solid rgba(255,255,255,.12); border-radius: 14px; padding: 1rem; background: rgba(255,255,255,.03); }
      .row { display: flex; gap: .75rem; align-items: baseline; justify-content: space-between; flex-wrap: wrap; }
      a { color: #9bd1ff; }
      .title { font-weight: 700; text-decoration: none; }
      .signals { display: flex; gap: .75rem; flex-wrap: wrap; align-items: baseline; }
      .feed, .human-json, .vouch { font-size: .95rem; }
      .feed.missing { opacity: .55; }
      .vouch { border: 1px solid rgba(155,209,255,.28); border-radius: 999px; padding: .12rem .55rem; color: #cfe9ff; background: rgba(155,209,255,.08); }
      .tags, .stats, .tag-index { display: flex; gap: .5rem; flex-wrap: wrap; list-style: none; padding: 0; }
      .tags { margin: .75rem 0 0; }
      .tags li, .tag-index li, .stats li { border: 1px solid rgba(255,255,255,.12); border-radius: 999px; padding: .2rem .55rem; font-size: .84rem; }
      .tags a, .tag-index a { text-decoration: none; }
      .tag-index li span { opacity: .7; margin-left: .25rem; }
      .browse { margin: 1.25rem 0 1.5rem; }
      code { background: rgba(255,255,255,.08); padding: .12rem .35rem; border-radius: .35rem; }
      .exports { display: flex; gap: .75rem; flex-wrap: wrap; margin: 1rem 0 1rem; padding: 0; list-style: none; }
      .exports a { text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p class="meta">Generated ${escapeHtml(generatedAt)} · OPML is for subscription, HTML is for wandering.</p>
      <p>Some parts of the web still work better as neighborhoods than feeds. This page is a small exported list of places worth returning to.</p>
      <ul class="stats">${stats}</ul>
      <p class="meta">A visible <code>publishes human.json</code> link means the site publishes that sidecar. An <code>included in draft vouch list</code> badge means this export would include the site in the generated <code>human.json</code> draft. Those are different signals.</p>
      <ul class="exports">
        <li><a href="./blogroll.opml">OPML</a></li>
        <li><a href="./smallweb.txt">smallweb.txt</a></li>
        <li><a href="./urls.txt">urls.txt</a></li>
        <li><a href="./domains.txt">domains.txt</a></li>
        <li><a href="./bookmarks.html">bookmarks.html</a></li>
        <li><a href="./sites.resolved.json">resolved JSON</a></li>
        <li><a href="./wander.js">wander.js</a></li>
        ${includeHumanJson ? '<li><a href="./human.json">human.json draft</a></li>' : ''}
      </ul>
      ${tagIndex}
      <ul class="sites">
        ${items}
      </ul>
    </main>
  </body>
</html>
`;
}

export function renderSmallwebTxt({ sites }) {
  return sites
    .filter((site) => site.feedUrl)
    .map((site) => site.feedUrl)
    .join('\n') + (sites.some((site) => site.feedUrl) ? '\n' : '');
}

export function renderUrlsTxt({ sites }) {
  return sites
    .map((site) => site.url)
    .join('\n') + (sites.length ? '\n' : '');
}

export function renderDomainsTxt({ sites }) {
  const domains = Array.from(new Set(
    sites
      .map((site) => {
        try {
          return new URL(site.url).hostname.toLowerCase();
        } catch {
          return null;
        }
      })
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));

  return domains.join('\n') + (domains.length ? '\n' : '');
}

export function renderBookmarksHtml({ title, sites, generatedAt = new Date().toISOString() }) {
  const bookmarks = sites.map((site) => `    <DT><A HREF="${escapeHtml(site.url)}"${site.tags.length ? ` TAGS="${escapeHtml(site.tags.join(','))}"` : ''}>${escapeHtml(site.title)}</A>${site.notes ? `\n    <DD>${escapeHtml(site.notes)}` : ''}`).join('\n');

  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<!-- This file is automatically generated. -->\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>${escapeHtml(title)}</TITLE>\n<H1>${escapeHtml(title)}</H1>\n<DL><p>\n    <DT><H3>Generated ${escapeHtml(generatedAt)} · full neighborhood bookmarks</H3>\n<DL><p>\n${bookmarks}\n</DL><p>\n</DL><p>\n`;
}

export function renderWander({ sites, consoles = [] }) {
  const pages = sites.map((site) => ({
    title: site.title,
    url: site.url,
    tags: site.tags,
    notes: site.notes,
  }));

  const payload = {
    consoles,
    pages,
  };

  return `const wander = ${JSON.stringify(payload, null, 2)};\n`;
}

export function renderHumanJson({ siteUrl, sites, version = '0.1.1', vouchedAt = new Date().toISOString().slice(0, 10) }) {
  const vouches = sites
    .filter((site) => site.human?.vouch !== false)
    .map((site) => ({
      url: site.url,
      vouched_at: site.human?.vouchedAt || vouchedAt,
    }));

  const payload = {
    version,
    url: siteUrl,
    vouches,
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function renderHumanJsonLinkSnippet({ href = './human.json' } = {}) {
  return `<!-- Add this to the <head> of pages covered by your human.json claim. -->\n<link rel="human-json" href="${escapeHtml(href)}" />\n`;
}

export function renderBlogrollLinkSnippet({ href = './blogroll.opml', title = 'Neighborhood' } = {}) {
  return `<!-- Add this to the <head> of pages that should advertise your blogroll export. -->\n<link rel="blogroll" type="text/x-opml" title="${escapeHtml(title)}" href="${escapeHtml(href)}" />\n`;
}
