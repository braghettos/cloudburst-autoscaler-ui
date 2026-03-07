import { test, expect } from '@playwright/test'

const clusterId = process.env.CLUSTER_ID
if (!clusterId) {
  throw new Error('CLUSTER_ID env var is required for e2e tests (e.g. from /api/clusters)')
}
const basePath = `/clusters/${clusterId}`

async function hasPageError(page: import('@playwright/test').Page): Promise<boolean> {
  // Definite page load errors
  if ((await page.getByText('Cluster not found').count()) > 0) return true
  if ((await page.getByText('Failed to load').count()) > 0) return true
  if ((await page.getByText(/clusterId required|cluster id required/i).count()) > 0) return true
  if ((await page.getByText('404 page not found').count()) > 0) return true
  if ((await page.getByText(/Unexpected token/).count()) > 0) return true
  if ((await page.getByText(/is not valid JSON/).count()) > 0) return true
  // bg-red-50 is used by both ErrorAlert (page error) and Overview's failed-claims banner (operational status).
  // Only treat as error when main content is absent (page failed to load).
  const hasMainContent = (await page.locator('main').getByText(/Cluster Overview|Workloads|Node Claims|Node Pools|Nodes|Resource Graph|Pods/).count()) > 0
  if (hasMainContent) return false
  if ((await page.locator('[class*="bg-red-50"]').count()) > 0) return true
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

  test('pods page loads without error', async ({ page }) => {
    await page.goto(`${basePath}/pods`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText(/Pods/, { timeout: CONTENT_TIMEOUT })
    expect(await hasPageError(page)).toBe(false)
  })

  test('overview page loads without error', async ({ page }) => {
    await page.goto(`${basePath}/overview`)
    await page.waitForLoadState('networkidle')
    for (let i = 0; i < 10; i++) {
      const hasSuccess = (await page.locator('main').getByText(/Cluster Overview|Workloads/).count()) > 0
      if (hasSuccess) break
      const retryBtn = page.getByRole('button', { name: /Retry/i })
      if (await retryBtn.isVisible()) {
        await retryBtn.click()
        await page.waitForLoadState('networkidle')
      }
      await page.waitForTimeout(2000)
    }
    expect(await hasPageError(page)).toBe(false)
    await expect(page.locator('main')).toContainText(/Cluster Overview|Workloads/, { timeout: CONTENT_TIMEOUT })
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

  test('events page loads without error', async ({ page }) => {
    await page.goto(`${basePath}/events`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText(/Kubernetes Events|Events/, { timeout: CONTENT_TIMEOUT })
    expect(await hasPageError(page)).toBe(false)
  })

  test('fleet page loads when multiple clusters or as fallback', async ({ page }) => {
    await page.goto('/fleet')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1')).toContainText(/Fleet Overview|cluster/, { timeout: CONTENT_TIMEOUT })
    expect(await hasPageError(page)).toBe(false)
  })

  // Provider E2E content assertions: run only when E2E_PROVIDER is set (per-provider integration tests)
  test.describe('provider content assertions', () => {
    const provider = process.env.E2E_PROVIDER || ''

    test('NodeClaims table has at least one row with provider, region, instanceType', async ({ page }) => {
      test.skip(!process.env.E2E_PROVIDER, 'E2E_PROVIDER not set')
      await page.goto(`${basePath}/nodeclaims`)
      await page.waitForLoadState('networkidle')
      expect(await hasPageError(page)).toBe(false)
      const rows = page.locator('table tbody tr')
      await expect(rows.first()).toBeVisible({ timeout: CONTENT_TIMEOUT })
      const rowCount = await rows.count()
      expect(rowCount).toBeGreaterThanOrEqual(1)
      const providerCell = page.locator('table tbody tr td').filter({ hasText: new RegExp(provider, 'i') }).first()
      await expect(providerCell).toBeVisible({ timeout: CONTENT_TIMEOUT })
    })

    test('Overview shows totalNodeClaims >= 1', async ({ page }) => {
      test.skip(!process.env.E2E_PROVIDER, 'E2E_PROVIDER not set')
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
      test.skip(!process.env.E2E_PROVIDER, 'E2E_PROVIDER not set')
      await page.goto(`${basePath}/graph`)
      await page.waitForLoadState('networkidle')
      expect(await hasPageError(page)).toBe(false)
      await expect(page.locator('main h1')).toContainText(/Resource Graph/, { timeout: CONTENT_TIMEOUT })
      const stats = page.locator('text=NodeClaims').or(page.locator('text=Nodes'))
      await expect(stats.first()).toBeVisible({ timeout: CONTENT_TIMEOUT })
    })
  })
})
