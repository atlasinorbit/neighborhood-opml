# neighborhood-opml

A tiny Node CLI for turning a hand-kept list of sites into:

- a human-readable blogroll page
- an `OPML` file people can import into feed readers
- a resolved JSON export with discovered feed URLs and optional `human.json` sidecars
- a `wander.js` export you can drop into a [Wander](https://codeberg.org/susam/wander) console
- an optional `human.json` export for publishing site-level vouches

This came out of wanting a web neighborhood to feel more returnable and less algorithm-shaped.
One hand-kept list can now feed subscription surfaces (`OPML`), lightweight discovery surfaces (`Wander`), and a small trust sidecar (`human.json`).

## Why

A lot of blogroll tooling is either tied to one CMS or heavier than it needs to be. Sometimes you just want a small file of sites, an exportable OPML, and a page that says: here are a few places worth revisiting.

## Input format

`sites.json`

```json
[
  {
    "title": "Example Site",
    "url": "https://example.com/",
    "feedUrl": "https://example.com/feed.xml",
    "humanJsonUrl": "https://example.com/human.json",
    "tags": ["notes", "design"],
    "notes": "Optional sentence about why this site matters."
  }
]
```

Only `title` and `url` are required.

- `feedUrl` may be set manually or discovered with `--discover`
- `humanJsonUrl` may be set manually or discovered with `--discover-human`

Optional `human` metadata lets you separate a general neighborhood list from the smaller set of sites you are actually willing to vouch for in `human.json`:

```json
{
  "title": "Example Site",
  "url": "https://example.com/",
  "human": {
    "vouch": false
  }
}
```

- `human.vouch: false` excludes a site from the generated `human.json`
- `human.vouchedAt: "YYYY-MM-DD"` overrides the default vouch date for that site

## Usage

```bash
node ./src/cli.js \
  --input ./example/sites.json \
  --out ./example/dist \
  --title "Atlas Neighborhood" \
  --discover \
  --discover-human \
  --console "https://susam.net/wander/" \
  --human-url "https://atlasinorbit.com/"
```

Outputs:

- `blogroll.opml`
- `index.html`
- `sites.resolved.json`
- `wander.js`
- `human.json` (when `--human-url` is provided)
- `human-json-link.html` (when `--human-url` is provided; a tiny `<head>` snippet for discovery)

The generated HTML page includes links to its sibling exports, so the neighborhood page can also act as a simple handoff surface instead of a dead-end display.

When `--human-url` is enabled, the HTML export also distinguishes two different signals:

- `publishes human.json` = the listed site exposes its own sidecar
- `included in draft vouch list` = your generated `human.json` draft would include that site as a vouch

That keeps discovery and trust adjacent without flattening them into the same thing.

## Feed autodiscovery

If `--discover` is enabled, the CLI will try to find a feed by:

1. checking `<link rel="alternate" ...>` tags for RSS/Atom
2. probing common feed paths like `/feed`, `/rss.xml`, `/atom.xml`, and `/index.xml`

If nothing is found, the HTML export still includes the site and marks the feed as missing.

If `--discover-human` is enabled, the CLI will also try to detect a published `human.json` sidecar by:

1. checking for `<link rel="human-json" ...>` in the page `<head>`
2. falling back to probing `/human.json`

This is intentionally treated as a discovery signal, not an automatic vouch.

## Wander export

The generated `wander.js` maps each site to a Wander `pages` entry and includes any `--console` URLs you pass on the CLI as the `consoles` list. That makes it easy to keep one small JSON file as the source of truth for both feed-reader imports and random-walk discovery.

## human.json export

If you pass `--human-url`, the CLI also writes a draft `human.json` file using your neighborhood list as the initial `vouches` array. By default each site becomes a vouch with the current UTC date as `vouched_at`, but you can opt specific entries out with `human.vouch: false` or override an individual date with `human.vouchedAt`.

It also writes `human-json-link.html`, a tiny snippet containing the required `<link rel="human-json" ...>` tag you can drop into your site `<head>`.

Important: `human.json` is a claim about **human authorship** and trust. Do not publish the generated file unless that claim is actually true for the site you are attaching it to. The export is there because a hand-kept neighborhood list is a useful starting point for a draft vouch graph, not because every site should automatically pretend to qualify.

Also note: browser-based verifiers expect the published `human.json` to be served with `Content-Type: application/json` and `Access-Control-Allow-Origin: *`.

## Development

```bash
npm test
npm run build:example
npm pack --dry-run
```

The example build enables both feed discovery and `human.json` sidecar discovery so the generated output exercises the full export path.

## License

MIT
