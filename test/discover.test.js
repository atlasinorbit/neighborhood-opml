import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverFeed, discoverFeedUrl, discoverBlogrollUrl, discoverHumanJsonUrl } from '../src/discover.js';

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

test('discoverFeed recognizes alternate links even when attributes are in a different order', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://example.com/');
    return {
      ok: true,
      url: 'https://example.com/',
      async text() {
        return '<html><head><link href="/atom.xml" title="Posts" type="application/atom+xml" rel="alternate"></head></html>';
      }
    };
  };

  try {
    const discovered = await discoverFeed('https://example.com/');
    assert.deepEqual(discovered, {
      feedUrl: 'https://example.com/atom.xml',
      feedType: 'atom'
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('discoverFeed recognizes JSON Feed alternate links', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://example.com/');
    return {
      ok: true,
      url: 'https://example.com/',
      async text() {
        return '<html><head><link type="application/feed+json" rel="alternate" href="/feed.json"></head></html>';
      }
    };
  };

  try {
    const discovered = await discoverFeed('https://example.com/');
    assert.deepEqual(discovered, {
      feedUrl: 'https://example.com/feed.json',
      feedType: 'json'
    });
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

test('discoverFeed probes common feed paths when alternate links are missing', async () => {
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
      return { ok: false, url, headers: new Headers() };
    }

    if (url === 'https://plain.example/feed.xml') {
      return { ok: true, url: 'https://plain.example/feed.xml', headers: new Headers({ 'content-type': 'application/rss+xml' }) };
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const discovered = await discoverFeed('https://plain.example/');
    assert.deepEqual(discovered, {
      feedUrl: 'https://plain.example/feed.xml',
      feedType: 'rss'
    });
    assert.deepEqual(calls, [
      { url: 'https://plain.example/', method: 'GET' },
      { url: 'https://plain.example/feed', method: 'HEAD' },
      { url: 'https://plain.example/feed.xml', method: 'HEAD' }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('discoverFeed falls back to /feed.json when that is the first working feed probe', async () => {
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

    if ([
      'https://plain.example/feed',
      'https://plain.example/feed.xml',
      'https://plain.example/rss.xml',
      'https://plain.example/atom.xml'
    ].includes(url)) {
      return { ok: false, url, headers: new Headers() };
    }

    if (url === 'https://plain.example/feed.json') {
      return { ok: true, url: 'https://plain.example/feed.json', headers: new Headers({ 'content-type': 'application/feed+json' }) };
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const discovered = await discoverFeed('https://plain.example/');
    assert.deepEqual(discovered, {
      feedUrl: 'https://plain.example/feed.json',
      feedType: 'json'
    });
    assert.deepEqual(calls, [
      { url: 'https://plain.example/', method: 'GET' },
      { url: 'https://plain.example/feed', method: 'HEAD' },
      { url: 'https://plain.example/feed.xml', method: 'HEAD' },
      { url: 'https://plain.example/rss.xml', method: 'HEAD' },
      { url: 'https://plain.example/atom.xml', method: 'HEAD' },
      { url: 'https://plain.example/feed.json', method: 'HEAD' }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('discoverBlogrollUrl returns linked blogroll when present', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://example.com/');
    return {
      ok: true,
      url: 'https://example.com/',
      async text() {
        return '<html><head><link rel="blogroll" href="/blogroll.opml"></head></html>';
      }
    };
  };

  try {
    const blogrollUrl = await discoverBlogrollUrl('https://example.com/');
    assert.equal(blogrollUrl, 'https://example.com/blogroll.opml');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('discoverBlogrollUrl falls back to conventional recommendation paths', async () => {
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

    if (url === 'https://plain.example/blogroll.opml' || url === 'https://plain.example/recommendations.opml') {
      return { ok: false, url };
    }

    if (url === 'https://plain.example/.well-known/recommendations.opml') {
      return { ok: true, url: 'https://plain.example/.well-known/recommendations.opml' };
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const blogrollUrl = await discoverBlogrollUrl('https://plain.example/');
    assert.equal(blogrollUrl, 'https://plain.example/.well-known/recommendations.opml');
    assert.deepEqual(calls, [
      { url: 'https://plain.example/', method: 'GET' },
      { url: 'https://plain.example/blogroll.opml', method: 'HEAD' },
      { url: 'https://plain.example/recommendations.opml', method: 'HEAD' },
      { url: 'https://plain.example/.well-known/recommendations.opml', method: 'HEAD' }
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

test('discoverHumanJsonUrl finds linked human.json even when href comes first', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://example.com/');
    return {
      ok: true,
      url: 'https://example.com/',
      async text() {
        return '<html><head><link href="/people/human.json" rel="human-json"></head></html>';
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
