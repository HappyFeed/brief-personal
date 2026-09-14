import { expect, test } from '@playwright/test'

// Plan: docs/specs/2026-09-03-noticias-fuente-rss/e2e-tests-plan.md
// MAX_ITEMS por defecto en src/config.ts — ver Case 3.
const MAX_ITEMS = 15

const RAW_ENTITY_PATTERN = /&#\d+;|&[a-zA-Z]+;/
const RAW_HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i

// Case 1 — Ver el briefing del día (happy path)
// Traces to: 3.1, 3.2, 3.4, 4.1, 4.2
test('muestra el briefing del día con noticias reales que enlazan al artículo original', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Briefing diario', level: 1 })).toBeVisible()

  // .description no expone rol/label propio (ver e2e/briefing.spec.ts).
  const articles = page.locator('article:not(.empty)')
  const count = await articles.count()
  expect(count).toBeGreaterThanOrEqual(1)

  const firstLink = articles.first().locator('h2 a')
  const href = await firstLink.getAttribute('href')
  expect(href).toMatch(/^https?:\/\//)
  expect(href).not.toMatch(/^https?:\/\/localhost/)

  const firstDescription = await articles.first().locator('.description').textContent()
  expect(firstDescription?.trim()).not.toBe('')

  // .meta .date no expone rol/label propio (ver e2e/briefing.spec.ts).
  const firstDate = await articles.first().locator('.meta .date').textContent()
  expect(firstDate?.trim()).not.toBe('')

  const dateTexts = await articles.locator('.meta .date').allTextContents()
  const dates = dateTexts.map((text) => new Date(text).getTime())
  for (const time of dates) {
    expect(Number.isNaN(time)).toBe(false)
  }
  for (let i = 1; i < dates.length; i++) {
    expect(dates[i]).toBeLessThanOrEqual(dates[i - 1])
  }
})

// Case 2 — Contenido crudo de RSS no se filtra sin sanear (failure/degrade path)
// Traces to: 2.2 (comportamiento defensivo de src/format/html.ts::escapeHtml)
test('sanea entidades HTML y tags crudos en títulos y descripciones', async ({ page }) => {
  await page.goto('/')

  const articles = page.locator('article:not(.empty)')
  await expect(articles.first()).toBeVisible()

  const titles = await page.locator('article h2').allTextContents()
  // .description no expone rol/label propio (ver e2e/briefing.spec.ts).
  const descriptions = await page.locator('.description').allTextContents()

  expect(titles.length).toBeGreaterThan(0)
  expect(descriptions.length).toBeGreaterThan(0)

  for (const text of [...titles, ...descriptions]) {
    expect(text).not.toMatch(RAW_ENTITY_PATTERN)
    expect(text).not.toMatch(RAW_HTML_TAG_PATTERN)
  }
})

// Case 3 — Límite de ítems mostrados (failure/degrade path)
// Traces to: 3.3
test('nunca muestra más ítems que el límite configurado (MAX_ITEMS)', async ({ page }) => {
  await page.goto('/')

  const articles = page.locator('article:not(.empty)')
  await expect(articles.first()).toBeVisible()

  const count = await articles.count()
  expect(count).toBeLessThanOrEqual(MAX_ITEMS)
})
