import { describe, expect, it } from 'vitest'
import { FEEDS, MAX_ITEMS, PORT } from './config'

describe('config', () => {
  it('expone FEEDS como array', () => {
    expect(Array.isArray(FEEDS)).toBe(true)
  })

  it('expone MAX_ITEMS con valor por defecto 15', () => {
    expect(MAX_ITEMS).toBe(15)
  })

  it('expone PORT con valor por defecto 3000', () => {
    expect(PORT).toBe(3000)
  })
})
