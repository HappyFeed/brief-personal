import { expect, test } from '@playwright/test'

const RAW_ENTITY_PATTERN = /&#\d+;|&[a-zA-Z]+;/
const RAW_HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*?>/i

test.describe('Briefing diario', () => {
  test('muestra el título y la fecha del día', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Briefing diario', level: 1 })).toBeVisible()
    await expect(page.locator('.eyebrow')).not.toBeEmpty()
  })

  test('renderiza noticias sin entidades HTML ni tags crudos en título/descripción', async ({
    page,
  }) => {
    await page.goto('/')

    const articles = page.locator('article:not(.empty)')
    await expect(articles.first()).toBeVisible()

    const titles = await page.locator('article h2').allTextContents()
    const descriptions = await page.locator('.description').allTextContents()

    for (const text of [...titles, ...descriptions]) {
      expect(text).not.toMatch(RAW_ENTITY_PATTERN)
      expect(text).not.toMatch(RAW_HTML_TAG_PATTERN)
    }
  })

  test('cada noticia enlaza al artículo original', async ({ page }) => {
    await page.goto('/')

    const links = page.locator('article:not(.empty) h2 a')
    const count = await links.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href')
      expect(href).toMatch(/^https?:\/\//)
    }
  })
})
