import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcesPage } from '../../../../page-objects/data-sources/data-sources.pageobject';
import { GRAFANA_URL } from '../../../../config/environment';
import { allAssetListProperties, nonDefaultAssetListProperties } from '../../../../constants/asset-list-properties.constant';

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

        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.vendor_name, 'vendor6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.name, 'name6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.model_name, 'model6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.workspace, 'Default')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.location, 'System-3')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.id, 'id6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.serial_number, 'serial6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.model_number, '0')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.vendor_number, '0')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.asset_type, 'DEVICE_UNDER_TEST')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.firmware_version, '1.2f')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.visa_resource_name, 'visa resource name 6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.part_number, 'partNumber6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.last_updated_timestamp, '2023-10-05T21:36:14.169Z')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.bus_type, 'BUILT_IN_SYSTEM')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.is_NI_asset, 'false')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.keywords, 'aaaaaaa, cccccc, a, test keyword')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.properties, '{"x":"y","a":"b"}')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.minionId, 'SYSTEM-3')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.parent_name, 'parent 6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.supports_self_calibration, 'true')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.supports_self_test, 'true')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.supports_reset, 'false')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.discovery_type, 'MANUAL')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.self_calibration, '2022-06-07T18:58:05.000Z')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.supports_external_calibration, 'true')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.calibration_due_date, '2025-09-06T21:00:00.000Z')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.is_system_controller, 'false')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.calibration_status, 'OK')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.scan_code, 'scanCode6')).toBeTruthy();
    });
});
