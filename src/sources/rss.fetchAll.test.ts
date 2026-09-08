import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAllFeeds } from './rss'

function jsonResponse({ ok, status, body }: { ok: boolean; status: number; body: string }) {
  return {
    ok,
    status,
    text: () => Promise.resolve(body),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function feedWithItem(title: string) {
  return `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>${title}</title>
      <link>https://example.com/${title}</link>
      <pubDate>Tue, 01 Sep 2026 10:00:00 GMT</pubDate>
      <description>Description ${title}</description>
    </item>
  </channel>
</rss>`
}

describe('fetchAllFeeds', () => {
  it('combina en una sola lista aplanada los items de todas las URLs exitosas, ignorando las que fallan', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === 'https://example.com/ok-1.xml') {
          return Promise.resolve(jsonResponse({ ok: true, status: 200, body: feedWithItem('Item A') }))
        }
        if (url === 'https://example.com/broken.xml') {
          return Promise.reject(new Error('network down'))
        }
        if (url === 'https://example.com/ok-2.xml') {
          return Promise.resolve(jsonResponse({ ok: true, status: 200, body: feedWithItem('Item B') }))
        }
        throw new Error(`unexpected url ${url}`)
      }),
    )

    const items = await fetchAllFeeds([
      'https://example.com/ok-1.xml',
      'https://example.com/broken.xml',
      'https://example.com/ok-2.xml',
    ])

    expect(items).toEqual([
      {
        title: 'Item A',
        link: 'https://example.com/Item A',
        pubDate: 'Tue, 01 Sep 2026 10:00:00 GMT',
        description: 'Description Item A',
      },
      {
        title: 'Item B',
        link: 'https://example.com/Item B',
        pubDate: 'Tue, 01 Sep 2026 10:00:00 GMT',
        description: 'Description Item B',
      },
    ])
  })

  it('con urls: [] devuelve [] sin lanzar', async () => {
    const items = await fetchAllFeeds([])

    expect(items).toEqual([])
  })
})
