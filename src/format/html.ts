import type { NewsItem } from '../sources/rss.js'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const EXTERNAL_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>`

function renderItem(item: NewsItem): string {
  return `
      <article>
        <h2><a href="${escapeHtml(item.link)}">${escapeHtml(item.title)}</a></h2>
        <div class="meta">
          <span class="date">${escapeHtml(item.pubDate)}</span>
          <span class="rule"></span>
          <span class="icon">${EXTERNAL_ICON}</span>
        </div>
        <p class="description">${escapeHtml(item.description)}</p>
      </article>`
}

function renderEmptyState(): string {
  return `
      <article class="empty">
        <h2>No hay noticias por el momento.</h2>
        <p class="description">Volvé a abrir la página más tarde: el briefing se arma de nuevo en cada visita.</p>
      </article>`
}

function formatEyebrow(date: Date): string {
  return date
    .toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .toUpperCase()
}

export function renderBriefing(items: NewsItem[], maxItems: number): string {
  const sorted = [...items].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  )
  const limited = sorted.slice(0, maxItems)

  const body =
    limited.length > 0 ? limited.map(renderItem).join('\n') : renderEmptyState()

  const eyebrow = formatEyebrow(new Date())
  const count =
    limited.length === 1 ? '1 noticia seleccionada' : `${limited.length} noticias seleccionadas`

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Briefing diario</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #faf9f6;
        --surface: #ffffff;
        --text-primary: #14151a;
        --text-secondary: #4a4d55;
        --text-muted: #7c7f88;
        --border: #e6e3dc;
        --accent: #b2431c;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0e0e0f;
          --surface: #17181a;
          --text-primary: #f2f1ee;
          --text-secondary: #a8aab0;
          --text-muted: #74777f;
          --border: #26282c;
          --accent: #f08a5d;
        }
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text-primary);
        font-family: 'Inter', sans-serif;
        padding: 72px 80px 96px;
      }
      .column {
        max-width: 720px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 40px;
      }
      .eyebrow {
        color: var(--accent);
        font-size: 11.5px;
        font-weight: 600;
        letter-spacing: 1.6px;
        margin: 0 0 14px;
      }
      h1 {
        font-family: 'Instrument Serif', serif;
        font-weight: 400;
        font-size: 60px;
        line-height: 1.05;
        margin: 0 0 14px;
      }
      .subhead {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        color: var(--text-secondary);
      }
      .subhead .rule {
        flex: 1;
        height: 1px;
        background: var(--border);
      }
      .subhead .freshness {
        font-size: 12px;
        color: var(--text-muted);
        white-space: nowrap;
      }
      .news-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      article {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 28px 30px;
      }
      article h2 {
        font-family: 'Instrument Serif', serif;
        font-weight: 400;
        font-size: 27px;
        line-height: 1.22;
        margin: 0 0 12px;
      }
      article h2 a {
        color: var(--text-primary);
        text-decoration: none;
      }
      article h2 a:hover {
        text-decoration: underline;
      }
      .meta {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 12px;
      }
      .meta .date {
        font-size: 11.5px;
        font-weight: 500;
        letter-spacing: 1.1px;
        color: var(--text-muted);
        white-space: nowrap;
      }
      .meta .rule {
        flex: 1;
        height: 1px;
        background: var(--border);
      }
      .meta .icon {
        display: flex;
        color: var(--accent);
        flex-shrink: 0;
      }
      .description {
        font-size: 15px;
        line-height: 1.62;
        color: var(--text-secondary);
        margin: 0;
      }
      article.empty {
        text-align: center;
        padding: 84px 60px 88px;
      }
      article.empty h2 {
        font-size: 30px;
      }
      footer {
        border-top: 1px solid var(--border);
        padding-top: 16px;
        font-size: 12.5px;
        line-height: 1.6;
        color: var(--text-muted);
      }
      @media (max-width: 600px) {
        body {
          padding: 40px 20px 60px;
        }
        h1 {
          font-size: 42px;
        }
        article {
          padding: 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="column">
      <header>
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1>Briefing diario</h1>
        <div class="subhead">
          <span>${count}</span>
          <span class="rule"></span>
          <span class="freshness">Actualizado al abrir</span>
        </div>
      </header>
      <div class="news-list">${body}
      </div>
      <footer>
        Los títulos enlazan al artículo original en el medio que lo publicó. Esta página se genera
        de nuevo en cada visita.
      </footer>
    </div>
  </body>
</html>`
}
