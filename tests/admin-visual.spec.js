const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

test('administración: captura visual y controles básicos de acceso', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/admin.html', { waitUntil: 'networkidle', timeout: 45000 });

  // Captura completa para revisar el aspecto publicado en cada tamaño.
  const outputDir = path.join(testInfo.outputDir, 'visual');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({
    path: path.join(outputDir, `admin-login-${testInfo.project.name}.png`),
    fullPage: true,
    animations: 'disabled',
  });

  await expect(page.locator('#loginBox')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#loginBtn')).toBeVisible();
  await expect(page.locator('#loginBox input[type="password"], #loginBox input[type="text"]').first()).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportHeight: document.documentElement.clientHeight,
  }));

  expect(
    dimensions.documentWidth,
    `La página tiene desbordamiento horizontal: ${JSON.stringify(dimensions)}`
  ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);

  // No se envían credenciales ni se modifica ningún dato: solo se abre y mide la página.
  expect(pageErrors, `Errores JavaScript: ${pageErrors.join(' | ')}`).toEqual([]);
});
