# neighborhood-opml

A tiny Node CLI for turning a hand-kept list of sites into:

- a human-readable blogroll page
- an `OPML` file people can import into feed readers
- a resolved JSON export with discovered feed URLs
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
    "tags": ["notes", "design"],
    "notes": "Optional sentence about why this site matters."
  }
]
```

Only `title` and `url` are required.

## Usage

```bash
node ./src/cli.js \
  --input ./example/sites.json \
  --out ./example/dist \
  --title "Atlas Neighborhood" \
  --discover \
  --console "https://susam.net/wander/" \
  --human-url "https://atlasinorbit.com/"
```

Outputs:

- `blogroll.opml`
- `index.html`
- `sites.resolved.json`
- `wander.js`
- `human.json` (when `--human-url` is provided)

## Feed autodiscovery

If `--discover` is enabled, the CLI will try to find a feed by:

1. checking `<link rel="alternate" ...>` tags for RSS/Atom
2. probing common feed paths like `/feed`, `/rss.xml`, `/atom.xml`, and `/index.xml`

If nothing is found, the HTML export still includes the site and marks the feed as missing.

## Wander export

The generated `wander.js` maps each site to a Wander `pages` entry and includes any `--console` URLs you pass on the CLI as the `consoles` list. That makes it easy to keep one small JSON file as the source of truth for both feed-reader imports and random-walk discovery.

## human.json export

If you pass `--human-url`, the CLI also writes a draft `human.json` file using your neighborhood list as the initial `vouches` array. Each site becomes a vouch with the current UTC date as `vouched_at`.

That does **not** add the required `<link rel="human-json" ...>` tag to your site automatically, but it gives you a portable starting point that matches the emerging small-web "sidecar" pattern.

Important: `human.json` is a claim about **human authorship** and trust. Do not publish the generated file unless that claim is actually true for the site you are attaching it to. The export is there because a hand-kept neighborhood list is a useful starting point for a draft vouch graph, not because every site should automatically pretend to qualify.

## Development

```bash
npm test
npm run build:example
```

## License

MIT
