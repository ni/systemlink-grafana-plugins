import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcesPage } from '../../../../page-objects/data-sources/data-sources.pageobject';
import { GRAFANA_URL } from '../../../../config/environment';
import { assetColumn, nonDefaultAssetListProperties } from '../../../../constants/asset-list-properties.constant';
import { pressEscape } from '../../../../utils/keyboard-utilities';

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
        await pressEscape(dashboard.page);

        expect(await dashboard.panel.table.checkColumnValue(assetColumn.vendor_name, 'vendor6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.name, 'name6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.model_name, 'model6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.workspace, 'Default')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.location, 'System-3')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.id, 'id6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.serial_number, 'serial6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.model_number, '0')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.vendor_number, '0')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.asset_type, 'DEVICE_UNDER_TEST')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.firmware_version, '1.2f')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.visa_resource_name, 'visa resource name 6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.part_number, 'partNumber6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.last_updated_timestamp, '2023-10-05T21:36:14.169Z')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.bus_type, 'BUILT_IN_SYSTEM')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.is_NI_asset, 'false')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.keywords, 'aaaaaaa, cccccc, a, test keyword')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.properties, '{"x":"y","a":"b"}')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.minionId, 'SYSTEM-3')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.parent_name, 'parent 6')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.supports_self_calibration, 'true')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.supports_self_test, 'true')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.supports_reset, 'false')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.discovery_type, 'MANUAL')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.self_calibration, '2022-06-07T18:58:05.000Z')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.supports_external_calibration, 'true')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.calibration_due_date, '2025-09-06T21:00:00.000Z')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.is_system_controller, 'false')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.calibration_status, 'OK')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(assetColumn.scan_code, 'scanCode6')).toBeTruthy();
    });
});
