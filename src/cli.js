#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeSites, renderHtml, renderOpml, renderSmallwebTxt, renderWander, renderHumanJson, renderHumanJsonLinkSnippet } from './render.js';
import { discoverFeedUrl, discoverHumanJsonUrl } from './discover.js';

function parseArgs(argv) {
  const args = { discover: false, discoverHuman: false, consoles: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--discover') args.discover = true;
    else if (token === '--discover-human') args.discoverHuman = true;
    else if (token === '--input') args.input = argv[++i];
    else if (token === '--out') args.out = argv[++i];
    else if (token === '--title') args.title = argv[++i];
    else if (token === '--console') args.consoles.push(argv[++i]);
    else if (token === '--human-url') args.humanUrl = argv[++i];
  }
  if (!args.input || !args.out) {
    throw new Error('Usage: neighborhood-opml --input ./sites.json --out ./dist [--title "My Neighborhood"] [--discover] [--discover-human] [--console https://example.com/wander/] [--human-url https://example.com/]');
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(await fs.readFile(args.input, 'utf8'));
  const sites = normalizeSites(raw);

  if (args.discover || args.discoverHuman) {
    for (const site of sites) {
      if (args.discover && !site.feedUrl) {
        site.feedUrl = await discoverFeedUrl(site.url);
        if (!site.feedUrl) {
          console.warn(`Could not discover a feed for ${site.url}`);
        }
      }

      if (args.discoverHuman && !site.humanJsonUrl) {
        site.humanJsonUrl = await discoverHumanJsonUrl(site.url);
      }
    }
  }

  await fs.mkdir(args.out, { recursive: true });
  const title = args.title || 'Neighborhood';
  await fs.writeFile(path.join(args.out, 'blogroll.opml'), renderOpml({ title, sites }));
  await fs.writeFile(path.join(args.out, 'smallweb.txt'), renderSmallwebTxt({ sites }));
  await fs.writeFile(path.join(args.out, 'index.html'), renderHtml({ title, sites, includeHumanJson: Boolean(args.humanUrl) }));
  await fs.writeFile(path.join(args.out, 'sites.resolved.json'), JSON.stringify(sites, null, 2) + '\n');
  await fs.writeFile(path.join(args.out, 'wander.js'), renderWander({ sites, consoles: args.consoles }));
  if (args.humanUrl) {
    await fs.writeFile(path.join(args.out, 'human.json'), renderHumanJson({ siteUrl: args.humanUrl, sites }));
    await fs.writeFile(path.join(args.out, 'human-json-link.html'), renderHumanJsonLinkSnippet());
  }

  const withFeeds = sites.filter((site) => site.feedUrl).length;
  const withHumanJson = sites.filter((site) => site.humanJsonUrl).length;
  const humanJsonNote = args.humanUrl ? ', human.json enabled' : '';
  console.log(`Wrote ${sites.length} sites to ${args.out} (${withFeeds} with feeds, ${withHumanJson} publishing human.json, ${args.consoles.length} consoles${humanJsonNote}).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
