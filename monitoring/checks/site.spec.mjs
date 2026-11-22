import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { pages, origin, visualMasks, maxLinks } from '../site.config.mjs';

for (const target of pages) {
  test(`${target.name}: page health`, async ({ page }, testInfo) => {
    const errors = [];
    const failedAssets = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(`${origin}/`) && response.status() >= 400 &&
          ['script', 'stylesheet', 'image', 'font'].includes(response.request().resourceType())) {
        failedAssets.push(`${response.status()} ${response.url()}`);
      }
    });
    const response = await page.goto(target.path, { waitUntil: 'load' });
    expect(response?.status(), 'Page must return HTTP 200').toBe(200);
    expect(new URL(page.url()).pathname, 'Unexpected redirect').toBe(target.path);
    await expect(page).toHaveTitle(/vimta/i);
    await expect(page.locator('body')).toContainText(target.text);
    // Scroll through the page so lazy images are actually requested.
    await page.evaluate(async () => {
      const height = Math.min(document.body.scrollHeight, 18000);
      for (let y = 0; y < height; y += 700) {
        window.scrollTo(0, y);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      window.scrollTo(0, 0);
    });
    await expect.poll(() => page.evaluate(() => [...document.images]
      .filter(img => img.getClientRects().length && img.currentSrc && (!img.complete || img.naturalWidth === 0))
      .map(img => img.currentSrc)), { message: 'Visible images must load' }).toEqual([]);
    await testInfo.attach('browser-diagnostics', {
      body: JSON.stringify({ errors, failedAssets }, null, 2), contentType: 'application/json',
    });
    expect.soft(errors, 'Uncaught JavaScript errors').toEqual([]);
    expect.soft(failedAssets, 'Broken first-party assets').toEqual([]);
    expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
      'Page overflows horizontally').toBe(true);
    await expect(page.locator('header a[href]').first()).toBeAttached();
    await expect(page.locator('footer')).toBeVisible();
  });

  test(`${target.name}: visual`, async ({ page }, testInfo) => {
    const file = `${target.name}.png`;
    // Baselines must be reviewed and committed. Never approve production changes automatically.
    test.skip(!existsSync(testInfo.snapshotPath(file)) && process.env.CREATE_BASELINES !== '1',
      'No approved baseline: use the baseline workflow, review images, then commit them.');
    await page.goto(target.path, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(file, {
      fullPage: false,
      animations: 'disabled',
      mask: visualMasks.map(selector => page.locator(selector)),
    });
  });
}

test('sampled internal links return successful responses', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'One crawl is sufficient for both viewports');
  test.setTimeout(180_000);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.href));
  const urls = [...new Set(links.flatMap(href => {
    try {
      const url = new URL(href);
      if (url.origin !== origin || /\/(wp-admin|wp-login|desk)(\/|\.|$)/.test(url.pathname) || url.search) return [];
      url.hash = '';
      return [url.href];
    } catch { return []; }
  }))];
  const selected = urls.slice(0, maxLinks);
  await testInfo.attach('crawl-coverage', {
    body: JSON.stringify({ discovered: urls.length, checked: selected }, null, 2), contentType: 'application/json',
  });
  for (const url of selected) {
    try {
      const result = await request.head(url, { timeout: 12_000 });
      let status = result.status();
      await result.dispose();
      if (status === 405 || status === 501) {
        const fallback = await request.get(url, { timeout: 12_000 });
        status = fallback.status();
        await fallback.dispose();
      }
      expect.soft(status, url).toBeGreaterThanOrEqual(200);
      expect.soft(status, url).toBeLessThan(400);
    } catch (error) { expect.soft(false, `${url}: ${error.message}`).toBe(true); }
  }
});

