import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcesPage } from '../../../../page-objects/data-sources/data-sources.pageobject';
import { allAssetListProperties, timeOutPeriod } from '../../../../constants/asset-list-properties.constant';

test.describe('Asset data source with minion id return type', () => {
    let dashboard: DashboardPage;
    let dataSources: DataSourcesPage;
    let createdDataSourceName = 'Systemlink Assets Minion Id Return Type';

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

    test.describe.serial('Minion id variable return type', () => {
        test('create an asset variable with minionId return type', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);

            await dashboard.toolbar.openSettings();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();
            await dashboard.settings.variable.setVariableName('id');
            await dashboard.settings.variable.selectDataSource(createdDataSourceName);
            await dashboard.settings.variable.selectQueryReturnType('Asset Id');
            await dashboard.settings.variable.applyVariableChanges();

            expect(dashboard.settings.createdVariable('id')).toBeDefined();

        });

        test('should create a Systemlink Assets visualization', async () => {
            await dashboard.settings.goBackToDashboardPage();
            await dashboard.addVisualizationButton.waitFor();
            await dashboard.addVisualization();
            await dashboard.selectDataSource(createdDataSourceName);
            await dashboard.panel.assetQueryEditor.switchToTableView();

            await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', createdDataSourceName);
        });

        test('should add filter by minionId using the asset variable', async () => {
            await dashboard.panel.assetQueryEditor.addFilter('Asset Identifier', 'equals', '$id');

            await expect(dashboard.panel.table.firstFilterRow).toContainText('Asset Identifier');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('equals');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('$id');
        });

        test('should verify that table data changes as the variable value changes', async () => {
            await dashboard.panel.table.getTable.first().waitFor({ state: 'visible', timeout: timeOutPeriod });

            let rowCount = await dashboard.panel.table.getTableRowCount();

            expect(rowCount).toBe(1);
            expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.vendor_name, 'vendor1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.name, 'name1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.model_name, 'model1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.workspace, 'Default')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.location, 'System-1')).toBeTruthy();

            await dashboard.panel.assetQueryEditor.openVariableDropdown('name1 (serial1)', 'name2 (serial2)');
            await dashboard.panel.assetQueryEditor.refreshData();

            rowCount = await dashboard.panel.table.getTableRowCount();

            expect(rowCount).toBe(1);
            expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.vendor_name, 'vendor2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.name, 'name2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.model_name, 'model2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.workspace, 'Workspace 2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(allAssetListProperties.location, 'System-2')).toBeTruthy();
        });
    });
});
