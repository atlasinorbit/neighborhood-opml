import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverFeedUrl, discoverHumanJsonUrl } from '../src/discover.js';

test('discoverFeedUrl returns feed from alternate link tag', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://example.com/');
    return {
      ok: true,
      url: 'https://example.com/',
      async text() {
        return '<html><head><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head></html>';
      }
    };
  };

  try {
    const feedUrl = await discoverFeedUrl('https://example.com/');
    assert.equal(feedUrl, 'https://example.com/feed.xml');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('discoverFeedUrl falls back to null when initial fetch fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('network down');
  };

  try {
    const feedUrl = await discoverFeedUrl('https://missing.example/');
    assert.equal(feedUrl, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('discoverFeedUrl probes common feed paths when alternate links are missing', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET' });

    if (url === 'https://plain.example/') {
      return {
        ok: true,
        url,
        async text() {
          return '<html><head></head><body>hello</body></html>';
        }
      };
    }

    if (url === 'https://plain.example/feed') {
      return { ok: false, url };
    }

    if (url === 'https://plain.example/feed.xml') {
      return { ok: true, url: 'https://plain.example/feed.xml' };
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const feedUrl = await discoverFeedUrl('https://plain.example/');
    assert.equal(feedUrl, 'https://plain.example/feed.xml');
    assert.deepEqual(calls, [
      { url: 'https://plain.example/', method: 'GET' },
      { url: 'https://plain.example/feed', method: 'HEAD' },
      { url: 'https://plain.example/feed.xml', method: 'HEAD' }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('discoverHumanJsonUrl returns linked human.json sidecar when present', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://example.com/');
    return {
      ok: true,
      url: 'https://example.com/',
      async text() {
        return '<html><head><link rel="human-json" href="/people/human.json"></head></html>';
      }
    };
  };

  try {
    const humanJsonUrl = await discoverHumanJsonUrl('https://example.com/');
    assert.equal(humanJsonUrl, 'https://example.com/people/human.json');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('discoverHumanJsonUrl falls back to /human.json when published without head link', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET' });

    if (url === 'https://plain.example/') {
      return {
        ok: true,
        url,
        async text() {
          return '<html><head></head><body>hello</body></html>';
        }
      };
    }

    if (url === 'https://plain.example/human.json') {
      return { ok: true, url: 'https://plain.example/human.json' };
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const humanJsonUrl = await discoverHumanJsonUrl('https://plain.example/');
    assert.equal(humanJsonUrl, 'https://plain.example/human.json');
    assert.deepEqual(calls, [
      { url: 'https://plain.example/', method: 'GET' },
      { url: 'https://plain.example/human.json', method: 'HEAD' }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
