import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSites, renderHtml, renderOpml, renderSmallwebTxt, renderWander, renderHumanJson, renderHumanJsonLinkSnippet } from '../src/render.js';

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
  assert.match(html, /\.\/blogroll\.opml/);
  assert.match(html, /\.\/smallweb\.txt/);
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
