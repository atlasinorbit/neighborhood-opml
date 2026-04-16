import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSites, renderHtml, renderOpml, renderSmallwebTxt, renderUrlsTxt, renderDomainsTxt, renderBookmarksHtml, renderWander, renderHumanJson, renderHumanJsonLinkSnippet, renderBlogrollLinkSnippet } from '../src/render.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('normalizeSites validates and preserves optional fields', () => {
  const sites = normalizeSites([
    { title: 'Example', url: 'https://example.com', humanJsonUrl: 'https://example.com/human.json', tags: ['one'], notes: 'hello', human: { vouch: false, vouchedAt: '2026-03-31' } }
  ]);

  assert.equal(sites[0].feedUrl, null);
  assert.equal(sites[0].humanJsonUrl, 'https://example.com/human.json');
  assert.deepEqual(sites[0].tags, ['one']);
  assert.equal(sites[0].notes, 'hello');
  assert.deepEqual(sites[0].human, { vouch: false, vouchedAt: '2026-03-31' });
});

test('renderOpml includes only sites with feeds', () => {
  const xml = renderOpml({
    title: 'Test',
    sites: [
      { title: 'One', url: 'https://one.test', feedUrl: 'https://one.test/feed', tags: [], notes: '' },
      { title: 'Two', url: 'https://two.test', feedUrl: null, tags: [], notes: '' }
    ]
  });

  assert.match(xml, /xmlUrl="https:\/\/one.test\/feed"/);
  assert.doesNotMatch(xml, /two.test/);
});

test('renderHtml marks missing feeds clearly and distinguishes human.json from draft vouches', () => {
  const html = renderHtml({
    title: 'Test',
    generatedAt: '2026-03-28T00:00:00.000Z',
    includeHumanJson: true,
    sites: [
      { title: 'Two', url: 'https://two.test', feedUrl: null, humanJsonUrl: 'https://two.test/human.json', tags: ['quiet'], notes: 'still worth returning to', human: null },
      { title: 'Three', url: 'https://three.test', feedUrl: 'https://three.test/feed.xml', humanJsonUrl: null, tags: ['math'], notes: '', human: { vouch: false } }
    ]
  });

  assert.match(html, /feed missing/);
  assert.match(html, /still worth returning to/);
  assert.match(html, /quiet/);
  assert.match(html, /Browse by tag/);
  assert.match(html, /href="#tag-quiet"/);
  assert.match(html, /href="#tag-math"/);
  assert.match(html, /2 sites/);
  assert.match(html, /1 with feeds/);
  assert.match(html, /1 publishing human\.json/);
  assert.match(html, /1 in draft vouch list/);
  assert.match(html, /publishes human\.json ↗/);
  assert.match(html, /included in draft vouch list/);
  assert.match(html, /different signals/);
  assert.match(html, /rel="blogroll"/);
  assert.match(html, /type="text\/x-opml"/);
  assert.match(html, /\.\/blogroll\.opml/);
  assert.match(html, /\.\/smallweb\.txt/);
  assert.match(html, /\.\/urls\.txt/);
  assert.match(html, /\.\/domains\.txt/);
  assert.match(html, /\.\/bookmarks\.html/);
  assert.match(html, /\.\/sites\.resolved\.json/);
  assert.match(html, /\.\/wander\.js/);
  assert.match(html, /\.\/human\.json/);

  const vouchBadgeCount = (html.match(/class="vouch">included in draft vouch list/g) || []).length;
  assert.equal(vouchBadgeCount, 1);
});

test('renderSmallwebTxt emits only feed urls as newline-separated text', () => {
  const txt = renderSmallwebTxt({
    sites: [
      { title: 'One', url: 'https://one.test', feedUrl: 'https://one.test/feed.xml', tags: [], notes: '' },
      { title: 'Two', url: 'https://two.test', feedUrl: null, tags: [], notes: '' },
      { title: 'Three', url: 'https://three.test', feedUrl: 'https://three.test/index.xml', tags: [], notes: '' }
    ]
  });

  assert.equal(txt, 'https://one.test/feed.xml\nhttps://three.test/index.xml\n');
});

test('renderUrlsTxt emits all site urls as newline-separated text', () => {
  const txt = renderUrlsTxt({
    sites: [
      { title: 'One', url: 'https://one.test', feedUrl: 'https://one.test/feed.xml', tags: [], notes: '' },
      { title: 'Two', url: 'https://two.test', feedUrl: null, tags: [], notes: '' }
    ]
  });

  assert.equal(txt, 'https://one.test\nhttps://two.test\n');
});

test('renderDomainsTxt emits unique sorted hostnames for quick review', () => {
  const txt = renderDomainsTxt({
    sites: [
      { title: 'One', url: 'https://one.test/path', feedUrl: 'https://one.test/feed.xml', tags: [], notes: '' },
      { title: 'Two', url: 'https://sub.two.test/', feedUrl: null, tags: [], notes: '' },
      { title: 'Three', url: 'https://one.test/elsewhere', feedUrl: null, tags: [], notes: '' }
    ]
  });

  assert.equal(txt, 'one.test\nsub.two.test\n');
});

test('renderBookmarksHtml emits a browser-importable bookmark export for all sites', () => {
  const html = renderBookmarksHtml({
    title: 'Test',
    generatedAt: '2026-04-13T20:30:00.000Z',
    sites: [
      { title: 'One', url: 'https://one.test', feedUrl: 'https://one.test/feed.xml', tags: ['math', 'quiet'], notes: 'a keeper' },
      { title: 'Two', url: 'https://two.test', feedUrl: null, tags: [], notes: '' }
    ]
  });

  assert.match(html, /NETSCAPE-Bookmark-file-1/);
  assert.match(html, /Generated 2026-04-13T20:30:00.000Z/);
  assert.match(html, /HREF="https:\/\/one.test"/);
  assert.match(html, /TAGS="math,quiet"/);
  assert.match(html, /a keeper/);
  assert.match(html, /HREF="https:\/\/two.test"/);
});

test('renderWander emits consoles and pages for Wander console use', () => {
  const js = renderWander({
    consoles: ['https://susam.net/wander/'],
    sites: [
      { title: 'Two', url: 'https://two.test', feedUrl: null, tags: ['quiet'], notes: 'still worth returning to' }
    ]
  });

  assert.match(js, /const wander =/);
  assert.match(js, /https:\/\/susam.net\/wander\//);
  assert.match(js, /https:\/\/two.test/);
  assert.match(js, /still worth returning to/);
});

test('renderHumanJson emits a draft vouch graph from the site list', () => {
  const json = renderHumanJson({
    siteUrl: 'https://atlasinorbit.com/',
    vouchedAt: '2026-03-30',
    sites: [
      { title: 'Two', url: 'https://two.test', feedUrl: null, tags: ['quiet'], notes: 'still worth returning to', human: null },
      { title: 'Three', url: 'https://three.test', feedUrl: null, tags: [], notes: '', human: { vouch: false } },
      { title: 'Four', url: 'https://four.test', feedUrl: null, tags: [], notes: '', human: { vouchedAt: '2026-03-12' } }
    ]
  });

  const payload = JSON.parse(json);
  assert.equal(payload.version, '0.1.1');
  assert.equal(payload.url, 'https://atlasinorbit.com/');
  assert.deepEqual(payload.vouches, [
    { url: 'https://two.test', vouched_at: '2026-03-30' },
    { url: 'https://four.test', vouched_at: '2026-03-12' }
  ]);
});

test('renderHumanJsonLinkSnippet emits the discovery tag for page head integration', () => {
  const snippet = renderHumanJsonLinkSnippet();

  assert.match(snippet, /Add this to the <head>/);
  assert.match(snippet, /rel="human-json"/);
  assert.match(snippet, /href="\.\/human\.json"/);
});

test('renderBlogrollLinkSnippet emits the discovery tag for blogroll head integration', () => {
  const snippet = renderBlogrollLinkSnippet({ title: 'Atlas Neighborhood' });

  assert.match(snippet, /Add this to the <head>/);
  assert.match(snippet, /rel="blogroll"/);
  assert.match(snippet, /type="text\/x-opml"/);
  assert.match(snippet, /title="Atlas Neighborhood"/);
  assert.match(snippet, /href="\.\/blogroll\.opml"/);
});

test('cli can emit a conventional .well-known recommendations.opml export', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'neighborhood-opml-'));
  const inputPath = path.join(tempDir, 'sites.json');
  const outDir = path.join(tempDir, 'dist');

  await fs.writeFile(inputPath, JSON.stringify([
    {
      title: 'One',
      url: 'https://one.test',
      feedUrl: 'https://one.test/feed.xml'
    }
  ], null, 2));

  await execFileAsync(process.execPath, [
    './src/cli.js',
    '--input', inputPath,
    '--out', outDir,
    '--title', 'Atlas Neighborhood',
    '--well-known'
  ], {
    cwd: process.cwd()
  });

  const opml = await fs.readFile(path.join(outDir, '.well-known', 'recommendations.opml'), 'utf8');
  assert.match(opml, /<title>Atlas Neighborhood<\/title>/);
  assert.match(opml, /xmlUrl="https:\/\/one.test\/feed.xml"/);
});
