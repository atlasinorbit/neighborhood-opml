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

    return {
      title: String(site.title),
      url: String(site.url),
      feedUrl: site.feedUrl ? String(site.feedUrl) : null,
      tags: Array.isArray(site.tags) ? site.tags.map(String) : [],
      notes: site.notes ? String(site.notes) : '',
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
  const items = sites.map((site) => {
    const tags = site.tags.length
      ? `<ul class="tags">${site.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>`
      : '';
    const feed = site.feedUrl
      ? `<a class="feed" href="${escapeHtml(site.feedUrl)}">feed ↗</a>`
      : '<span class="feed missing">feed missing</span>';
    const notes = site.notes ? `<p>${escapeHtml(site.notes)}</p>` : '';

    return `<li>
      <div class="row">
        <a class="title" href="${escapeHtml(site.url)}">${escapeHtml(site.title)}</a>
        ${feed}
      </div>
      ${notes}
      ${tags}
    </li>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: dark light; }
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0b1020; color: #e6edf3; }
      main { max-width: 52rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
      h1 { margin-bottom: .5rem; }
      p.meta { opacity: .72; margin-top: 0; }
      ul.sites { list-style: none; padding: 0; display: grid; gap: 1rem; }
      ul.sites > li { border: 1px solid rgba(255,255,255,.12); border-radius: 14px; padding: 1rem; background: rgba(255,255,255,.03); }
      .row { display: flex; gap: .75rem; align-items: baseline; justify-content: space-between; flex-wrap: wrap; }
      a { color: #9bd1ff; }
      .title { font-weight: 700; text-decoration: none; }
      .feed { font-size: .95rem; }
      .feed.missing { opacity: .55; }
      .tags { display: flex; gap: .5rem; flex-wrap: wrap; list-style: none; padding: 0; margin: .75rem 0 0; }
      .tags li { border: 1px solid rgba(255,255,255,.12); border-radius: 999px; padding: .2rem .55rem; font-size: .84rem; }
      code { background: rgba(255,255,255,.08); padding: .12rem .35rem; border-radius: .35rem; }
      .exports { display: flex; gap: .75rem; flex-wrap: wrap; margin: 1rem 0 1.5rem; padding: 0; list-style: none; }
      .exports a { text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p class="meta">Generated ${escapeHtml(generatedAt)} · OPML is for subscription, HTML is for wandering.</p>
      <p>Some parts of the web still work better as neighborhoods than feeds. This page is a small exported list of places worth returning to.</p>
      <ul class="exports">
        <li><a href="./blogroll.opml">OPML</a></li>
        <li><a href="./sites.resolved.json">resolved JSON</a></li>
        <li><a href="./wander.js">wander.js</a></li>
        ${includeHumanJson ? '<li><a href="./human.json">human.json draft</a></li>' : ''}
      </ul>
      <ul class="sites">
        ${items}
      </ul>
    </main>
  </body>
</html>
`;
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
  const payload = {
    version,
    url: siteUrl,
    vouches: sites.map((site) => ({
      url: site.url,
      vouched_at: vouchedAt,
    })),
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}
