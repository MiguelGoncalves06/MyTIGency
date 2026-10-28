// node lab/secao6/v12/bake/bake.mjs http://localhost:5173
// Abre bake/index.html no Chromium do Playwright e grava o que window.__bake devolve em lab/secao6/v12/.
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.argv[2] ?? 'http://localhost:5173'
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
page.on('console', (m) => console.log('page:', m.text()))
page.on('pageerror', (e) => console.log('pageerror:', e.message))
await page.goto(`${base}/lab/secao6/v12/bake/`)
const files = await page.evaluate(() => window.__bake)
for (const [name, val] of Object.entries(files)) {
  const p = join(root, name)
  mkdirSync(dirname(p), { recursive: true })
  if (typeof val === 'string' && val.startsWith('data:')) writeFileSync(p, Buffer.from(val.split(',')[1], 'base64'))
  else writeFileSync(p, JSON.stringify(val, null, 1))
  console.log('wrote', name)
}
await browser.close()
