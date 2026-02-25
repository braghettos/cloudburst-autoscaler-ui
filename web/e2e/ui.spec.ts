import { test, expect } from '@playwright/test'

const clusterId = process.env.CLUSTER_ID
if (!clusterId) {
  throw new Error('CLUSTER_ID env var is required for e2e tests (e.g. from /api/clusters)')
}
const basePath = `/clusters/${clusterId}`

async function hasPageError(page: import('@playwright/test').Page): Promise<boolean> {
  if ((await page.locator('[class*="bg-red-50"]').count()) > 0) return true
  if ((await page.getByText('Cluster not found').count()) > 0) return true
  if ((await page.getByText('Failed to load').count()) > 0) return true
  if ((await page.getByText('404 page not found').count()) > 0) return true
  if ((await page.getByText(/Unexpected token/).count()) > 0) return true
  if ((await page.getByText(/is not valid JSON/).count()) > 0) return true
  return false
}

test.describe('CloudBurst UI pages', () => {
  test('root redirects to cluster overview when single cluster', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Should redirect to /clusters/{id}/overview or show fleet
    const url = page.url()
    expect(url).toMatch(/\/clusters\/[\w-]+\/overview|\/fleet/)
  })

  const CONTENT_TIMEOUT = 15000

  test('overview page loads without error', async ({ page }) => {
    await page.goto(`${basePath}/overview`)
    await page.waitForLoadState('networkidle')
    expect(await hasPageError(page)).toBe(false)
    await expect(page.locator('main h1')).toContainText(/Cluster Overview|Overview/, { timeout: CONTENT_TIMEOUT })
  })

  test('pods page loads without error', async ({ page }) => {
    await page.goto(`${basePath}/pods`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText(/Pods/, { timeout: CONTENT_TIMEOUT })
    expect(await hasPageError(page)).toBe(false)
  })

  test('nodeclaims page loads without error', async ({ page }) => {
    await page.goto(`${basePath}/nodeclaims`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText(/Node Claims|NodeClaims/, { timeout: CONTENT_TIMEOUT })
    expect(await hasPageError(page)).toBe(false)
  })

  test('nodepools page loads without error', async ({ page }) => {
    await page.goto(`${basePath}/nodepools`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText(/Node Pools|NodePools/, { timeout: CONTENT_TIMEOUT })
    expect(await hasPageError(page)).toBe(false)
  })

  test('nodes page loads without error', async ({ page }) => {
    await page.goto(`${basePath}/nodes`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText(/Nodes/, { timeout: CONTENT_TIMEOUT })
    expect(await hasPageError(page)).toBe(false)
  })

  test('graph page loads without error', async ({ page }) => {
    await page.goto(`${basePath}/graph`)
    await page.waitForLoadState('networkidle')
    expect(await hasPageError(page)).toBe(false)
    await expect(page.locator('main h1')).toContainText(/Resource Graph/, { timeout: CONTENT_TIMEOUT })
  })

  test('logs page loads without error', async ({ page }) => {
    await page.goto(`${basePath}/logs`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText(/CloudBurst|Logs|Controller/, { timeout: CONTENT_TIMEOUT })
    expect(await hasPageError(page)).toBe(false)
  })

  test('fleet page loads when multiple clusters or as fallback', async ({ page }) => {
    await page.goto('/fleet')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText(/Fleet Overview|cluster/, { timeout: CONTENT_TIMEOUT })
    expect(await hasPageError(page)).toBe(false)
  })
})
