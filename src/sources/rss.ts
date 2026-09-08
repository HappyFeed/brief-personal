export interface NewsItem {
  title: string
  link: string
  pubDate: string
  description: string
}

function extractTag(itemXml: string, tag: string): string {
  const match = itemXml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  if (!match) return ''
  return decodeCdataAndEntities(match[1].trim())
}

function decodeCdataAndEntities(raw: string): string {
  const cdataMatch = raw.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/)
  const text = cdataMatch ? cdataMatch[1] : raw
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function parseRssXml(xml: string): NewsItem[] {
  try {
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g)
    if (!itemMatches) return []

    return itemMatches.map((itemXml) => ({
      title: extractTag(itemXml, 'title'),
      link: extractTag(itemXml, 'link'),
      pubDate: extractTag(itemXml, 'pubDate'),
      description: extractTag(itemXml, 'description'),
    }))
  } catch {
    return []
  }
}

function looksLikeRssXml(body: string): boolean {
  return /<\?xml|<rss[\s>]|<feed[\s>]/i.test(body)
}

export async function fetchFeed(url: string): Promise<NewsItem[]> {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      console.error(`fetchFeed: respuesta no exitosa (status ${response.status}) descargando ${url}`)
      return []
    }

    const body = await response.text()
    if (!looksLikeRssXml(body)) {
      console.error(`fetchFeed: contenido descargado de ${url} no parece RSS/XML`)
      return []
    }

    return parseRssXml(body)
  } catch (error) {
    console.error(`fetchFeed: error descargando ${url}`, error)
    return []
  }
}
