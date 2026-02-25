import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcesPage } from '../../../../page-objects/data-sources/data-sources.pageobject';
import { interceptApiRoute } from '../../../../utils/intercept-api-route';
import { timeOutPeriod } from '../../../../constants/asset-list-properties.constant';
import { AssetSummaryResponse } from '../../../../models/asset-summary-response';

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
        const [assetSummaryResponse] = await Promise.all([
            interceptApiRoute<AssetSummaryResponse>(dashboard.page, '**/niapm/v1/asset-summary'),
            dashboard.panel.assetQueryEditor.selectQueryType('Asset Summary')
        ]);

        await dashboard.panel.table.getTable.waitFor({ timeout: timeOutPeriod });

        expect(assetSummaryResponse).toBeDefined();

        let rowCount = await dashboard.panel.table.getTableRowCount();

        expect(rowCount).toBe(1);
        expect(await dashboard.panel.table.checkColumnValue('Total', assetSummaryResponse.total.toString())).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Active', assetSummaryResponse.active.toString())).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Not active', assetSummaryResponse.notActive.toString())).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Approaching due date', assetSummaryResponse.approachingRecommendedDueDate.toString())).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Past due date', assetSummaryResponse.pastRecommendedDueDate.toString())).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Out for calibration', assetSummaryResponse.outForCalibration.toString())).toBeTruthy();
    });
});
