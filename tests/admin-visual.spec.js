const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

test('administración: login y navegación completa en móvil/escritorio', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/admin.html', { waitUntil: 'networkidle', timeout: 45000 });

  const outputDir = path.join(testInfo.outputDir, 'visual');
  fs.mkdirSync(outputDir, { recursive: true });

  // Primera captura: acceso, sin introducir credenciales.
  await expect(page.locator('#loginBox')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#loginBtn')).toBeVisible();
  await expect(page.locator('#adminPass')).toBeVisible();
  await page.screenshot({
    path: path.join(outputDir, `admin-login-${testInfo.project.name}.png`),
    fullPage: true,
    animations: 'disabled',
  });

  // Muestra el panel solo en el navegador de prueba: no inicia sesión ni escribe en Supabase.
  await page.locator('#loginBox').evaluate(el => el.classList.add('hidden'));
  await page.locator('#dashboard').evaluate(el => el.classList.remove('hidden'));
  await page.waitForTimeout(100);

  await expect(page.locator('#eiAdminNav')).toBeAttached();
  await expect(page.locator('.ei-admin-quick-card')).toHaveCount(6);
  await expect(page.locator('#productForm')).toBeAttached();
  await expect(page.locator('#categoryManager')).toBeAttached();
  await expect(page.locator('#salesReport')).toBeAttached();
  await expect(page.locator('#reviewsAdmin')).toBeAttached();
  await expect(page.locator('#reviewNotifications')).toBeAttached();
  await expect(page.locator('#deliveryZonesPanel')).toBeAttached();

  const mobile = testInfo.project.name.includes('mobile');
  const menuButton = page.locator('#eiHeaderMenuToggle');
  if (mobile) {
    await expect(menuButton).toBeVisible();
    await expect(page.locator('#eiMobileMenuToggle')).toBeHidden();
    await expect(page.locator('#eiAdminNav')).not.toHaveClass(/is-open/);
    await menuButton.click();
    await expect(page.locator('#eiAdminNav')).toHaveClass(/is-open/);
    await expect(page.locator('#eiNavShade')).toHaveClass(/is-open/);
    await page.screenshot({
      path: path.join(outputDir, 'admin-sidebar-mobile-open.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(page.locator('#eiAdminNav')).not.toHaveClass(/is-open/);
    await menuButton.click();
    await page.locator('#eiAdminNav a[href="#salesReport"]').click();
    await expect(page.locator('#salesReport')).not.toHaveClass(/ei-view-hidden/);
    await expect(page.locator('#storeSettings')).toHaveClass(/ei-view-hidden/);
  } else {
    await expect(menuButton).toBeHidden();
    await expect(page.locator('#eiAdminNav')).toBeVisible();
    await page.locator('#eiAdminNav a[href="#categoryManager"]').click();
    await expect(page.locator('#categoryManager')).not.toHaveClass(/ei-view-hidden/);
  }

  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(
    dimensions.documentWidth,
    `La página tiene desbordamiento horizontal: ${JSON.stringify(dimensions)}`
  ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);

  expect(pageErrors, `Errores JavaScript: ${pageErrors.join(' | ')}`).toEqual([]);
});
