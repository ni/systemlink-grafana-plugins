import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcesPage } from '../../../../page-objects/data-sources/data-sources.pageobject';

test.describe('Asset Summary Table', () => {
    let dashboard: DashboardPage;
    let dataSources: DataSourcesPage;
    let createdDataSourceName = 'Systemlink Assets Summary Table';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSources = new DataSourcesPage(page);
        dashboard = new DashboardPage(page);
        await dataSources.addDataSource('SystemLink Assets', createdDataSourceName);
    });

    test.afterAll(async () => {
        await dataSources.deleteDataSource(createdDataSourceName);
    });

    test('should create a Systemlink Assets visualization', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.addVisualizationButton.waitFor();
        await dashboard.addVisualization();
        await dashboard.selectDataSource(createdDataSourceName);
        await dashboard.panel.assetQueryEditor.switchToTableView();

        await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', createdDataSourceName);
    });

    test('should display correct asset summary values', async () => {
        await dashboard.panel.assetQueryEditor.selectQueryType('Asset Summary');
        await dashboard.panel.table.getTable.waitFor({ timeout: 10000 });

        let rowCount = await dashboard.panel.table.getTableRowCount();

        expect(rowCount).toBe(1);
        expect(await dashboard.panel.table.checkColumnValue('Total', '10')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Active', '3')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Not active', '7')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Approaching due date', '3')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Past due date', '3')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Out for calibration', '1')).toBeTruthy();
    });
});
