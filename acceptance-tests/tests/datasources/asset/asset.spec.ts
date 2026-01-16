import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../../config/environment';

test.describe('AssetDataSource', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/connections/datasources/new`);
        await page.click('button:has-text("SystemLink Assets")');

        await page.waitForSelector('text=HTTP');

        await page.getByTestId('data-testid Datasource HTTP settings url').fill('https://dev-api.lifecyclesolutions.ni.com');
        await page.getByRole('button', { name: 'Add header' }).click();
        await page.getByRole('textbox', { name: 'X-Custom-Header' }).fill('x-ni-api-key');
        await page.getByRole('textbox', { name: 'Value' }).fill('rOkM_Cn9QuztyOCIOu-tG7tcEvlOZdQfRlHeDkiLXh');

        await page.click('button:has-text("Save & test")');
        await page.waitForSelector('text=Data source connected and authentication successful!', { timeout: 10000 });
    });

    test.afterEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/connections/datasources`);

        await page.getByRole('link', { name: 'ni-slasset-datasource', exact: true }).click();
        await page.getByTestId('Data source settings page Delete button').click();
        await page.getByTestId('data-testid Confirm Modal Danger Button').click();
    });

    test('should switch between query types correctly', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard/new`);

        await page.waitForSelector('text=Add visualization');
        await page.click('text=Add visualization');
        await page.waitForSelector('text=SystemLink Assets');
        await page.click('text=SystemLink Assets');
        await page.waitForSelector('text=Query type');

        const queryTypeDropdown = page.locator('label:has-text("Query type")').locator('..').locator('select, [role="combobox"]');

        await queryTypeDropdown.click();
        await expect(page.getByTestId('data-testid Select menu').getByText('List Assets', { exact: true })).toBeVisible();
        await expect(page.getByText('Calibration Forecast', { exact: true })).toBeVisible();
        await expect(page.getByText('Asset Summary', { exact: true })).toBeVisible();
    });
});