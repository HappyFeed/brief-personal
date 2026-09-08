import { describe, expect, it } from 'vitest'
import type { NewsItem } from '../sources/rss'
import { renderBriefing } from './html'

function item(overrides: Partial<NewsItem>): NewsItem {
  return {
    title: 'Title',
    link: 'https://example.com/item',
    pubDate: 'Tue, 01 Sep 2026 10:00:00 GMT',
    description: 'Description',
    ...overrides,
  }
}

describe('renderBriefing', () => {
  it('ordena los ítems por pubDate descendente', () => {
    const items = [
      item({ title: 'Oldest', pubDate: 'Sun, 30 Aug 2026 10:00:00 GMT' }),
      item({ title: 'Newest', pubDate: 'Wed, 02 Sep 2026 10:00:00 GMT' }),
      item({ title: 'Middle', pubDate: 'Mon, 31 Aug 2026 10:00:00 GMT' }),
    ]

    const html = renderBriefing(items, 15)

    const newestIndex = html.indexOf('Newest')
    const middleIndex = html.indexOf('Middle')
    const oldestIndex = html.indexOf('Oldest')
    expect(newestIndex).toBeGreaterThanOrEqual(0)
    expect(newestIndex).toBeLessThan(middleIndex)
    expect(middleIndex).toBeLessThan(oldestIndex)
  })

  it('recorta a los primeros maxItems', () => {
    const items = [
      item({ title: 'First', pubDate: 'Wed, 02 Sep 2026 10:00:00 GMT' }),
      item({ title: 'Second', pubDate: 'Tue, 01 Sep 2026 10:00:00 GMT' }),
      item({ title: 'Third', pubDate: 'Mon, 31 Aug 2026 10:00:00 GMT' }),
    ]

    const html = renderBriefing(items, 2)

    expect(html).toContain('First')
    expect(html).toContain('Second')
    expect(html).not.toContain('Third')
  })

  it('incluye título como link, fecha y descripción por ítem', () => {
    const items = [
      item({
        title: 'Some Title',
        link: 'https://example.com/some-article',
        pubDate: 'Tue, 01 Sep 2026 10:00:00 GMT',
        description: 'Some description',
      }),
    ]

    const html = renderBriefing(items, 15)

    expect(html).toContain('<a href="https://example.com/some-article">Some Title</a>')
    expect(html).toContain('Tue, 01 Sep 2026 10:00:00 GMT')
    expect(html).toContain('Some description')
  })

  it('un ítem con description vacía se renderiza sin romper el HTML', () => {
    const items = [item({ title: 'No Description Item', description: '' })]

    const html = renderBriefing(items, 15)

    expect(html).toContain('No Description Item')
  })

  it('lista vacía: renderiza un mensaje de "no hay noticias"', () => {
    const html = renderBriefing([], 15)

    expect(html.toLowerCase()).toContain('no hay noticias')
  })
})
