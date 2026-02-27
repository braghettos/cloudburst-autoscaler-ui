import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'

/**
 * Full CloudBurst UI flow with screenshot capture at each step.
 * Screenshots are saved to test-results/flow-screenshots/ and uploaded as CI artifacts.
 */
const clusterId = process.env.CLUSTER_ID
if (!clusterId) {
  throw new Error('CLUSTER_ID env var is required for e2e tests (e.g. from /api/clusters)')
}
const basePath = `/clusters/${clusterId}`
const SCREENSHOT_DIR = 'test-results/flow-screenshots'
const CONTENT_TIMEOUT = 15000

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function capture(page: import('@playwright/test').Page, name: string) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
}

async function waitForContent(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500) // Allow charts/graphs to render
}

test.describe('CloudBurst UI full flow (screenshots)', () => {
  test('capture entire CloudBurst flow with screenshots', async ({ page }) => {
    // 1. Root → redirects to overview or fleet
    await page.goto('/')
    await waitForContent(page)
    await capture(page, '01-root-redirect')
    const url = page.url()
    expect(url).toMatch(/\/clusters\/[\w-]+\/overview|\/fleet/)

    // 2. Overview
    await page.goto(`${basePath}/overview`)
    await waitForContent(page)
    await expect(page.locator('main')).toContainText(/Cluster Overview|Workloads/, { timeout: CONTENT_TIMEOUT })
    await capture(page, '02-overview')

    // 3. Pods
    await page.goto(`${basePath}/pods`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Pods/, { timeout: CONTENT_TIMEOUT })
    await capture(page, '03-pods')

    // 4. NodeClaims
    await page.goto(`${basePath}/nodeclaims`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Node Claims|NodeClaims/, { timeout: CONTENT_TIMEOUT })
    await capture(page, '04-nodeclaims')

    // 5. NodePools
    await page.goto(`${basePath}/nodepools`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Node Pools|NodePools/, { timeout: CONTENT_TIMEOUT })
    await capture(page, '05-nodepools')

    // 6. Nodes
    await page.goto(`${basePath}/nodes`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Nodes/, { timeout: CONTENT_TIMEOUT })
    await capture(page, '06-nodes')

    // 7. Graph
    await page.goto(`${basePath}/graph`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Resource Graph/, { timeout: CONTENT_TIMEOUT })
    await capture(page, '07-graph')

    // 8. Logs
    await page.goto(`${basePath}/logs`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/CloudBurst|Logs|Controller/, { timeout: CONTENT_TIMEOUT })
    await capture(page, '08-logs')

    // 9. Metrics
    await page.goto(`${basePath}/metrics`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Metrics|Prometheus/, { timeout: CONTENT_TIMEOUT })
    await capture(page, '09-metrics')

    // 10. Events
    await page.goto(`${basePath}/events`)
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Kubernetes Events|Events/, { timeout: CONTENT_TIMEOUT })
    await capture(page, '10-events')

    // 11. Fleet
    await page.goto('/fleet')
    await waitForContent(page)
    await expect(page.locator('main h1')).toContainText(/Fleet Overview|cluster/, { timeout: CONTENT_TIMEOUT })
    await capture(page, '11-fleet')
  })
})
