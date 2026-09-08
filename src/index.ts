import { FEEDS, MAX_ITEMS, PORT } from './config.js'
import { fetchAllFeeds } from './sources/rss.js'
import { renderBriefing } from './format/html.js'
import { startServer } from './server.js'

const items = await fetchAllFeeds(FEEDS)
const html = renderBriefing(items, MAX_ITEMS)
const server = startServer(html, PORT)

server.on('listening', () => {
  console.log(`Briefing disponible en http://localhost:${PORT}`)
})
