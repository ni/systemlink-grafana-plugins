import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcesPage } from '../../../../page-objects/data-sources/data-sources.pageobject';

test.describe('Asset data source with scan code return type', () => {
    let dashboard: DashboardPage;
    let dataSources: DataSourcesPage;
    let createdDataSourceName = 'Systemlink Assets Scan Code Return Type';

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

    test.describe.serial('Scan code variable return type', () => {
        test('create an asset variable with scan code return type', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);

            await dashboard.toolbar.openSettings();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();
            await dashboard.settings.variable.setVariableName('scanCode');
            await dashboard.settings.variable.selectDataSource(createdDataSourceName);
            await dashboard.settings.variable.selectQueryReturnType('Scan Code');
            await dashboard.settings.variable.applyVariableChanges();

            expect(dashboard.settings.createdVariable('scanCode')).toBeDefined();

        });

        test('should create a Systemlink Assets visualization', async () => {
            await dashboard.settings.goBackToDashboardPage();
            await dashboard.addVisualizationButton.waitFor();
            await dashboard.addVisualization();
            await dashboard.selectDataSource(createdDataSourceName);
            await dashboard.panel.assetQueryEditor.switchToTableView();

            await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', createdDataSourceName);
        });

        test('should add scan code property to the table', async () => {
            await dashboard.panel.assetQueryEditor.openQueryProperties();
            await dashboard.panel.assetQueryEditor.selectQueryProperty('scan code');
            await dashboard.panel.assetQueryEditor.pressEscapeKey();
        });

        test('should add filter by scanCode using the asset variable', async () => {
            await dashboard.panel.assetQueryEditor.addFilter('Scan Code', 'equals', '$scanCode');

            await expect(dashboard.panel.table.firstFilterRow).toContainText('Scan Code');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('equals');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('$scanCode');
        });

        test('should verify that table data changes as the variable value changes', async () => {
            await dashboard.panel.table.getTable.first().waitFor({ state: 'visible', timeout: 10000 });

            let rowCount = await dashboard.panel.table.getTableRowCount();

            expect(rowCount).toBe(1);
            await expect(dashboard.panel.table.cellValue('Acme')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('SDFGSDFG234')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('ABCD')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('Default')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('c44750b7-1f22-4fec-b475-73b10e966217')).toBeVisible();

            await dashboard.panel.assetQueryEditor.openVariableDropdown('SDFGSDFG234 (SDFGSDFG234)', 'Energizer MAX AA DUT 5 (1238)');
            await dashboard.panel.assetQueryEditor.refreshData();

            rowCount = await dashboard.panel.table.getTableRowCount();

            expect(rowCount).toBe(1);
            await expect(dashboard.panel.table.cellValue('vendor 5')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('Energizer MAX AA DUT 5')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('HR-3')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('Default')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('1b5c6cfa-2c89-4f12-894b-c07106c04848')).toBeVisible();
        });
    });
});