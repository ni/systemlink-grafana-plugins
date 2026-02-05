import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../config/environment';

test.describe('Assets Plugin Discovery', () => {
    test('should appear in datasource list', async ({ page }) => {
        await page.goto(`${GRAFANA_URL}/connections/datasources/new`);
        await expect(page.locator('button:has-text("SystemLink Assets")')).toBeVisible();
    });
});