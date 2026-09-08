import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchFeed } from './rss'

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

const VALID_FEED_WITH_ITEM = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Only item</title>
      <link>https://example.com/only</link>
      <pubDate>Tue, 01 Sep 2026 10:00:00 GMT</pubDate>
      <description>Description</description>
    </item>
  </channel>
</rss>`

const VALID_FEED_WITHOUT_ITEMS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
  </channel>
</rss>`

describe('fetchFeed', () => {
  it('éxito con XML RSS válido y al menos un item: devuelve items parseados sin loguear error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ ok: true, status: 200, body: VALID_FEED_WITH_ITEM })),
    )

    const items = await fetchFeed('https://example.com/feed.xml')

    expect(items).toEqual([
      {
        title: 'Only item',
        link: 'https://example.com/only',
        pubDate: 'Tue, 01 Sep 2026 10:00:00 GMT',
        description: 'Description',
      },
    ])
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('éxito con XML RSS válido sin items: resuelve [] sin loguear error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ ok: true, status: 200, body: VALID_FEED_WITHOUT_ITEMS })),
    )

    const items = await fetchFeed('https://example.com/empty-feed.xml')

    expect(items).toEqual([])
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('error de red: resuelve [], loguea el error, no lanza', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const items = await fetchFeed('https://example.com/feed.xml')

    expect(items).toEqual([])
    expect(errorSpy).toHaveBeenCalled()
  })

  it('status no-2xx: resuelve [], loguea el error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ ok: false, status: 500, body: 'Internal Server Error' })),
    )

    const items = await fetchFeed('https://example.com/feed.xml')

    expect(items).toEqual([])
    expect(errorSpy).toHaveBeenCalled()
  })

  it('la descarga del body falla a mitad de camino: resuelve [], loguea el error, no lanza', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.reject(new Error('connection reset mid-body')),
      }),
    )

    const items = await fetchFeed('https://example.com/feed.xml')

    expect(items).toEqual([])
    expect(errorSpy).toHaveBeenCalled()
  })

  it('éxito pero body que no parece RSS/XML: resuelve [] y loguea el error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ ok: true, status: 200, body: '<html><body>Not Found</body></html>' })),
    )

    const items = await fetchFeed('https://example.com/feed.xml')

    expect(items).toEqual([])
    expect(errorSpy).toHaveBeenCalled()
  })
})
