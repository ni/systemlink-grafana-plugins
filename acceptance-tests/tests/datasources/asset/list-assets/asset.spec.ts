import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcesPage } from '../../../../page-objects/data-sources/data-sources.pageobject';
import { GRAFANA_URL } from '../../../../config/environment';

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
        await dashboard.panel.assetQueryEditor.addFilter('Scan Code', 'equals', '1b5c6cfa-2c89-4f12-894b-c07106c04848');

        await dashboard.panel.assetQueryEditor.openQueryProperties();
        await dashboard.panel.assetQueryEditor.selectQueryProperty('id');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('serial number');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('model number');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('vendor number');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('asset type');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('firmware version');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('visa resource name');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('part number');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('last updated timestamp');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('bus type');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('is NI asset');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('keywords');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('properties');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('minionId');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('parent name');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('supports self calibration');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('supports self test');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('supports reset');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('discovery type');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('self calibration');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('supports external calibration');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('calibration due date');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('is system controller');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('calibration status');
        await dashboard.panel.assetQueryEditor.selectQueryProperty('scan code');
        await dashboard.panel.assetQueryEditor.pressEscapeKey();

        await expect(dashboard.panel.table.getColumnHeaderByIndex(0)).toHaveText('vendor name');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(1)).toHaveText('name');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(2)).toHaveText('model name');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(3)).toHaveText('workspace');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(4)).toHaveText('location');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(5)).toHaveText('id');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(6)).toHaveText('serial number');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(7)).toHaveText('model number');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(8)).toHaveText('vendor number');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(9)).toHaveText('asset type');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(10)).toHaveText('firmware version');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(11)).toHaveText('visa resource name');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(12)).toHaveText('part number');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(13)).toHaveText('last updated timestamp');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(14)).toHaveText('bus type');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(15)).toHaveText('is NI asset');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(16)).toHaveText('keywords');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(17)).toHaveText('properties');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(18)).toHaveText('minionId');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(19)).toHaveText('parent name');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(20)).toHaveText('supports self calibration');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(21)).toHaveText('supports self test');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(22)).toHaveText('supports reset');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(23)).toHaveText('discovery type');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(24)).toHaveText('self calibration');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(25)).toHaveText('supports external calibration');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(26)).toHaveText('calibration due date');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(27)).toHaveText('is system controller');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(28)).toHaveText('calibration status');
        await expect(dashboard.panel.table.getColumnHeaderByIndex(29)).toHaveText('scan code');

        expect(await dashboard.panel.table.getCellInRowByIndex(0, 0)).toBe('vendor 5');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 1)).toBe('Energizer MAX AA DUT 5');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 2)).toBe('HR-3');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 3)).toBe('Default');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 4)).toBe('System-3');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 5)).toBe('1b5c6cfa-2c89-4f12-894b-c07106c04848');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 6)).toBe('1238');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 7)).toBe('0');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 8)).toBe('0');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 9)).toBe('DEVICE_UNDER_TEST');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 10)).toBe('1.2f');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 11)).toBe('visa resource name 6');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 12)).toBe('HR-3');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 13)).toBe('2023-10-05T21:36:14.169Z');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 14)).toBe('BUILT_IN_SYSTEM');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 15)).toBe('false');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 16)).toBe('aaaaaaa, cccccc, a, test keyword');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 17)).toBe('{"x":"y","a":"b"}');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 18)).toBe('SYSTEM-3');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 19)).toBe('parent 6');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 20)).toBe('true');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 21)).toBe('true');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 22)).toBe('false');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 23)).toBe('MANUAL');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 24)).toBe('2022-06-07T18:58:05.000Z');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 25)).toBe('true');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 26)).toBe('2025-09-06T21:00:00.000Z');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 27)).toBe('false');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 28)).toBe('OK');
        expect(await dashboard.panel.table.getCellInRowByIndex(0, 29)).toBe('1b5c6cfa-2c89-4f12-894b-c07106c04848');

    });
});
