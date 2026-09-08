import { describe, expect, it } from 'vitest'
import { parseRssXml } from './rss'

const WELL_FORMED_FEED = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Example Feed</title>
    <item>
      <title>First item</title>
      <link>https://example.com/first</link>
      <pubDate>Tue, 01 Sep 2026 10:00:00 GMT</pubDate>
      <description>First description</description>
    </item>
    <item>
      <title>Second item</title>
      <link>https://example.com/second</link>
      <pubDate>Wed, 02 Sep 2026 10:00:00 GMT</pubDate>
      <description>Second description</description>
    </item>
  </channel>
</rss>`

const ITEM_WITHOUT_DESCRIPTION = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>No description here</title>
      <link>https://example.com/no-desc</link>
      <pubDate>Tue, 01 Sep 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

describe('parseRssXml', () => {
  it('extrae título/link/pubDate/description de cada item, en el orden del XML', () => {
    const items = parseRssXml(WELL_FORMED_FEED)

    expect(items).toEqual([
      {
        title: 'First item',
        link: 'https://example.com/first',
        pubDate: 'Tue, 01 Sep 2026 10:00:00 GMT',
        description: 'First description',
      },
      {
        title: 'Second item',
        link: 'https://example.com/second',
        pubDate: 'Wed, 02 Sep 2026 10:00:00 GMT',
        description: 'Second description',
      },
    ])
  })

  it('usa "" cuando falta <description>', () => {
    const items = parseRssXml(ITEM_WITHOUT_DESCRIPTION)

    expect(items).toEqual([
      {
        title: 'No description here',
        link: 'https://example.com/no-desc',
        pubDate: 'Tue, 01 Sep 2026 10:00:00 GMT',
        description: '',
      },
    ])
  })

  it('devuelve [] sin lanzar ante un string vacío', () => {
    expect(parseRssXml('')).toEqual([])
  })

  it('devuelve [] sin lanzar ante XML malformado', () => {
    expect(parseRssXml('esto no es XML ni RSS')).toEqual([])
  })
})
