import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcesPage } from '../../../../page-objects/data-sources/data-sources.pageobject';
import { GRAFANA_URL } from '../../../../config/environment';
import { defaultAssetListProperties, nonDefaultAssetListProperties } from '../../../../utils/asset-list-properties.constant';

test.describe('Asset data source with asset variable', () => {
    let dashboard: DashboardPage;
    let dataSources: DataSourcesPage;
    const createdDataSourceName = 'Systemlink Assets General';

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

    test('should verify all table data properties are correct', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.assetQueryEditor.switchToTableView();
        await dashboard.panel.assetQueryEditor.addFilter('Scan Code', 'equals', 'scanCode6');

        await dashboard.panel.assetQueryEditor.openQueryProperties();
        await dashboard.panel.assetQueryEditor.addSelectedPropertyToTable([...nonDefaultAssetListProperties]);
        await dashboard.panel.assetQueryEditor.pressEscapeKey();

        expect(await dashboard.panel.table.checkColumnsValues([...defaultAssetListProperties, ...nonDefaultAssetListProperties], ['vendor6', 'name6', 'model6', 'Default', 'System-3', 'id6', 'serial6', '0', '0', 'DEVICE_UNDER_TEST', '1.2f', 'visa resource name 6', 'partNumber6', '2023-10-05T21:36:14.169Z', 'BUILT_IN_SYSTEM', 'false', 'aaaaaaa, cccccc, a, test keyword', '{"x":"y","a":"b"}', 'SYSTEM-3', 'parent 6', 'true', 'true', 'false', 'MANUAL', '2022-06-07T18:58:05.000Z', 'true', '2025-09-06T21:00:00.000Z', 'false', 'OK', 'scanCode6'])).toBeTruthy();
    });
});
