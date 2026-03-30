import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSites, renderHtml, renderOpml, renderWander, renderHumanJson } from '../src/render.js';

test('normalizeSites validates and preserves optional fields', () => {
  const sites = normalizeSites([
    { title: 'Example', url: 'https://example.com', tags: ['one'], notes: 'hello' }
  ]);

  assert.equal(sites[0].feedUrl, null);
  assert.deepEqual(sites[0].tags, ['one']);
  assert.equal(sites[0].notes, 'hello');
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

test('renderHtml marks missing feeds clearly', () => {
  const html = renderHtml({
    title: 'Test',
    generatedAt: '2026-03-28T00:00:00.000Z',
    sites: [
      { title: 'Two', url: 'https://two.test', feedUrl: null, tags: ['quiet'], notes: 'still worth returning to' }
    ]
  });

  assert.match(html, /feed missing/);
  assert.match(html, /still worth returning to/);
  assert.match(html, /quiet/);
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
      { title: 'Two', url: 'https://two.test', feedUrl: null, tags: ['quiet'], notes: 'still worth returning to' }
    ]
  });

  const payload = JSON.parse(json);
  assert.equal(payload.version, '0.1.1');
  assert.equal(payload.url, 'https://atlasinorbit.com/');
  assert.deepEqual(payload.vouches, [{ url: 'https://two.test', vouched_at: '2026-03-30' }]);
});
