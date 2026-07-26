import { test, expect } from '@playwright/test';

// Dispatch a pointer stroke of a given pointerType along a list of [x,y] client points.
async function stroke(page, selector, points, pointerType) {
  await page.evaluate(
    ({ selector, points, pointerType }) => {
      const elErr = document.querySelector(selector);
      const r = elErr.getBoundingClientRect();
      const ev = (type, [px, py], id) =>
        elErr.dispatchEvent(
          new PointerEvent(type, {
            pointerId: id,
            pointerType,
            clientX: r.left + px,
            clientY: r.top + py,
            bubbles: true,
            cancelable: true,
          })
        );
      ev('pointerdown', points[0], 1);
      for (let i = 1; i < points.length; i++) ev('pointermove', points[i], 1);
      ev('pointerup', points[points.length - 1], 1);
    },
    { selector, points, pointerType }
  );
}

test('renders the sentence with the target blank', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sentence .blank')).toBeVisible();
  await expect(page.locator('#sentence .blank')).toContainText('〇');
});

test('palm rejection: touch is ignored after a pen stroke', async ({ page }) => {
  await page.goto('/');
  // Override onStroke with a call counter, isolated from judge/undo behavior.
  await page.evaluate(() => {
    window.__calls = 0;
    window.__ink.penSeen = false;
    window.__ink.clear();
    window.__ink.onStroke = () => { window.__calls++; };
  });
  // A pen stroke: sets penSeen=true and fires onStroke once.
  await stroke(page, '#ink', [[20, 20], [80, 80]], 'pen');
  // A following touch stroke (palm) must be ignored: onStroke must NOT fire.
  await stroke(page, '#ink', [[10, 300], [300, 300]], 'touch');
  const calls = await page.evaluate(() => window.__calls);
  expect(calls).toBe(1);
});

test('model button animates and check button reveals overlay', async ({ page }) => {
  await page.goto('/');
  await page.click('#btn-model');
  await expect(page.locator('#model path')).not.toHaveCount(0);
  await page.click('#btn-clear');
  await page.click('#btn-check');
  await expect(page.locator('#model path')).not.toHaveCount(0);
});

test('is installable: manifest link and apple meta are present', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  const capable = await page
    .locator('meta[name="apple-mobile-web-app-capable"]')
    .getAttribute('content');
  expect(capable).toBe('yes');
});
