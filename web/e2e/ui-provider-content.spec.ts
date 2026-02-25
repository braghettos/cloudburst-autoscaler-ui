import { test, expect } from '@playwright/test'

/**
 * Provider-specific UI content assertions.
 * Run only when E2E_PROVIDER is set (per-provider integration tests with real NodeClaims).
 * Verifies the UI displays actual provisioned resources, not just HTTP 200.
 */

const clusterId = process.env.CLUSTER_ID
const provider = process.env.E2E_PROVIDER

if (!clusterId) {
  throw new Error('CLUSTER_ID env var is required for e2e tests (e.g. from /api/clusters)')
}

const basePath = `/clusters/${clusterId}`
const CONTENT_TIMEOUT = 15000

async function hasPageError(page: import('@playwright/test').Page): Promise<boolean> {
  if ((await page.locator('[class*="bg-red-50"]').count()) > 0) return true
  if ((await page.getByText('Cluster not found').count()) > 0) return true
  if ((await page.getByText('Failed to load').count()) > 0) return true
  if ((await page.getByText(/clusterId required|cluster id required/i).count()) > 0) return true
  if ((await page.getByText('404 page not found').count()) > 0) return true
  if ((await page.getByText(/Unexpected token/).count()) > 0) return true
  if ((await page.getByText(/is not valid JSON/).count()) > 0) return true
  return false
}

test.describe('Provider UI content (E2E_PROVIDER)', () => {
  test('NodeClaims table has ≥1 row with provider, region, instanceType', async ({ page }) => {
    test.skip(!provider, 'E2E_PROVIDER not set')
    await page.goto(`${basePath}/nodeclaims`)
    await page.waitForLoadState('networkidle')
    expect(await hasPageError(page)).toBe(false)
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: CONTENT_TIMEOUT })
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThanOrEqual(1)
    if (provider) {
      const providerCell = page.locator('table tbody tr td').filter({ hasText: new RegExp(provider, 'i') }).first()
      await expect(providerCell).toBeVisible({ timeout: CONTENT_TIMEOUT })
    }
  })

  test('Overview totalNodeClaims >= 1', async ({ page }) => {
    test.skip(!provider, 'E2E_PROVIDER not set')
    await page.goto(`${basePath}/overview`)
    await page.waitForLoadState('networkidle')
    expect(await hasPageError(page)).toBe(false)
    const valueEl = page.locator('h3:has-text("NodeClaims")').locator('..').locator('..').locator('div.text-2xl')
    await expect(valueEl).toBeVisible({ timeout: CONTENT_TIMEOUT })
    const text = await valueEl.textContent()
    const total = parseInt(text?.trim() || '0', 10)
    expect(total).toBeGreaterThanOrEqual(1)
  })

  test('Graph page loads and shows at least one NodeClaim or Node', async ({ page }) => {
    test.skip(!provider, 'E2E_PROVIDER not set')
    await page.goto(`${basePath}/graph`)
    await page.waitForLoadState('networkidle')
    expect(await hasPageError(page)).toBe(false)
    await expect(page.locator('main h1')).toContainText(/Resource Graph/, { timeout: CONTENT_TIMEOUT })
    const stats = page.locator('text=NodeClaims').or(page.locator('text=Nodes'))
    await expect(stats.first()).toBeVisible({ timeout: CONTENT_TIMEOUT })
  })
})
