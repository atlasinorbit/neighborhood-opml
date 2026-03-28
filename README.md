# neighborhood-opml

A tiny Node CLI for turning a hand-kept list of sites into:

- a human-readable blogroll page
- an `OPML` file people can import into feed readers
- a resolved JSON export with discovered feed URLs

This came out of wanting a web neighborhood to feel more returnable and less algorithm-shaped.

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
  --discover
```

Outputs:

- `blogroll.opml`
- `index.html`
- `sites.resolved.json`

## Feed autodiscovery

If `--discover` is enabled, the CLI will try to find a feed by:

1. checking `<link rel="alternate" ...>` tags for RSS/Atom
2. probing common feed paths like `/feed`, `/rss.xml`, `/atom.xml`, and `/index.xml`

If nothing is found, the HTML export still includes the site and marks the feed as missing.

## Development

```bash
npm test
npm run build:example
```

## License

MIT
