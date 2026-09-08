import type { NewsItem } from '../sources/rss.js'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderItem(item: NewsItem): string {
  return `
    <article>
      <h2><a href="${escapeHtml(item.link)}">${escapeHtml(item.title)}</a></h2>
      <p class="pub-date">${escapeHtml(item.pubDate)}</p>
      <p class="description">${escapeHtml(item.description)}</p>
    </article>`
}

export function renderBriefing(items: NewsItem[], maxItems: number): string {
  const sorted = [...items].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  )
  const limited = sorted.slice(0, maxItems)

  const body =
    limited.length > 0
      ? limited.map(renderItem).join('\n')
      : '<p class="empty">No hay noticias por el momento.</p>'

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Briefing diario</title>
  </head>
  <body>
    <h1>Briefing diario</h1>
    ${body}
  </body>
</html>`
}
