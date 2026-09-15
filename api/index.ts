import type { IncomingMessage, ServerResponse } from 'node:http'
import { FEEDS, MAX_ITEMS } from '../src/config.js'
import { fetchAllFeeds } from '../src/sources/rss.js'
import { renderBriefing } from '../src/format/html.js'

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const items = await fetchAllFeeds(FEEDS)
  const html = renderBriefing(items, MAX_ITEMS)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(html)
}
