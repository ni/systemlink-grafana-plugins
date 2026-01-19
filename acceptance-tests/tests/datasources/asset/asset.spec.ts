import { test, expect } from '@playwright/test';
import { BASE_URL, FAKE_API_URL } from '../../../config/environment';
import { DashboardPage } from '../../../page-objects/dashboard/dashboard.pageobject';

test.describe('AssetDataSource', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/connections/datasources/new`);
        await page.click('button:has-text("SystemLink Assets")');

        await page.waitForSelector('text=HTTP');

        await page.getByTestId('data-testid Datasource HTTP settings url').fill(FAKE_API_URL);

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
        const dashboard = new DashboardPage(page);

        await page.goto(`${BASE_URL}/dashboard/new`);

        await dashboard.addVisualizationButton.waitFor();
        await dashboard.toolbar.addVisualization();
        await dashboard.selectDataSource('SystemLink Assets');
        await dashboard.waitForQueryEditor();

        await dashboard.assetQueryEditor.openQueryTypeDropdown();
        await expect(dashboard.assetQueryEditor.getQueryTypeOption('List Assets')).toBeVisible();
        await expect(dashboard.assetQueryEditor.getQueryTypeOption('Calibration Forecast')).toBeVisible();
        await expect(dashboard.assetQueryEditor.getQueryTypeOption('Asset Summary')).toBeVisible();
    });

    test('should contain both output types', async ({ page }) => {
        const dashboard = new DashboardPage(page);

        await page.goto(`${BASE_URL}/dashboard/new`);

        await dashboard.addVisualizationButton.waitFor();
        await dashboard.toolbar.addVisualization();
        await dashboard.selectDataSource('SystemLink Assets');
        await dashboard.waitForQueryEditor();

        await expect(dashboard.assetQueryEditor.getOutputTypeOption('Properties')).toBeVisible();
        await expect(dashboard.assetQueryEditor.getOutputTypeOption('Total Count')).toBeVisible();
    })
});