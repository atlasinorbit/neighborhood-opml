#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeSites, renderHtml, renderOpml, renderWander } from './render.js';
import { discoverFeedUrl } from './discover.js';

function parseArgs(argv) {
  const args = { discover: false, consoles: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--discover') args.discover = true;
    else if (token === '--input') args.input = argv[++i];
    else if (token === '--out') args.out = argv[++i];
    else if (token === '--title') args.title = argv[++i];
    else if (token === '--console') args.consoles.push(argv[++i]);
  }
  if (!args.input || !args.out) {
    throw new Error('Usage: neighborhood-opml --input ./sites.json --out ./dist [--title "My Neighborhood"] [--discover] [--console https://example.com/wander/]');
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(await fs.readFile(args.input, 'utf8'));
  const sites = normalizeSites(raw);

  if (args.discover) {
    for (const site of sites) {
      if (!site.feedUrl) {
        site.feedUrl = await discoverFeedUrl(site.url);
        if (!site.feedUrl) {
          console.warn(`Could not discover a feed for ${site.url}`);
        }
      }
    }
  }

  await fs.mkdir(args.out, { recursive: true });
  const title = args.title || 'Neighborhood';
  await fs.writeFile(path.join(args.out, 'blogroll.opml'), renderOpml({ title, sites }));
  await fs.writeFile(path.join(args.out, 'index.html'), renderHtml({ title, sites }));
  await fs.writeFile(path.join(args.out, 'sites.resolved.json'), JSON.stringify(sites, null, 2) + '\n');
  await fs.writeFile(path.join(args.out, 'wander.js'), renderWander({ sites, consoles: args.consoles }));

  const withFeeds = sites.filter((site) => site.feedUrl).length;
  console.log(`Wrote ${sites.length} sites to ${args.out} (${withFeeds} with feeds, ${args.consoles.length} consoles).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
