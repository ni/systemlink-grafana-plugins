import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcePage } from '../../../../page-objects/data-sources/data-source.pageobject';
import { assetColumn } from '../../../../constants/asset-list-properties.constant';
import { pressEscape } from '../../../../utils/keyboard-utilities';
import { timeOutPeriod } from '../../../../constants/global.constant';

test.describe('Asset data source with scan code return type', () => {
    let dashboard: DashboardPage;
    let dataSources: DataSourcePage;
    let createdDataSourceName = 'Systemlink Assets Scan Code Return Type';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSources = new DataSourcePage(page);
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
            await dashboard.settings.assetVariable.setVariableName('scanCode');
            await dashboard.settings.assetVariable.selectDataSource(createdDataSourceName);
            await dashboard.settings.assetVariable.selectQueryReturnType('Asset Tag Path', 'Scan Code');
            await dashboard.settings.assetVariable.applyVariableChanges();

            expect(dashboard.settings.createdVariable('scanCode')).toBeDefined();

        });

        test('should create a Systemlink Assets visualization', async () => {
            await dashboard.settings.goBackToDashboardPage();
            await dashboard.addVisualizationButton.waitFor();
            await dashboard.addVisualization();
            await dashboard.selectDataSource(createdDataSourceName);
            await dashboard.panel.toolbar.switchToTableView();

            await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', createdDataSourceName);
        });

        test('should add scan code property to the table', async () => {
            await dashboard.panel.assetQueryEditor.openQueryProperties();
            await dashboard.panel.assetQueryEditor.selectQueryProperty('scan code');
            await pressEscape(dashboard.page);
        });

        test('should add filter by scanCode using the asset variable', async () => {
            await dashboard.panel.assetQueryEditor.addFilter('Scan Code', 'equals', '$scanCode');

            await expect(dashboard.panel.table.firstFilterRow).toContainText('Scan Code');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('equals');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('$scanCode');
        });

        test('should verify that table data changes as the variable value changes', async () => {
            await dashboard.panel.table.getTable.first().waitFor({ state: 'visible', timeout: timeOutPeriod });

            let rowCount = await dashboard.panel.table.getTableRowCount();

            expect(rowCount).toBe(1);
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.vendor_name, 'vendor1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.name, 'name1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.model_name, 'model1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.workspace, 'Default')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.location, 'System-1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.scan_code, 'scanCode1')).toBeTruthy();
            await dashboard.panel.assetQueryEditor.openVariableDropdown('name1 (serial1)', 'name6 (serial6)');
            await dashboard.panel.toolbar.refreshData();

            rowCount = await dashboard.panel.table.getTableRowCount();

            expect(rowCount).toBe(1);
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.vendor_name, 'vendor6')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.name, 'name6')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.model_name, 'model6')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.workspace, 'Default')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.location, 'System-3')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.scan_code, 'scanCode6')).toBeTruthy();
        });
    });
});
