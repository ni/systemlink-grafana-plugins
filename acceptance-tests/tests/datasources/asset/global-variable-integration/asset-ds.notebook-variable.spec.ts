import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { pressEscape } from '../../../../utils/keyboard-utilities';
import { assetColumn } from '../../../../constants/asset-list-properties.constant';
import { timeOutPeriod } from '../../../../constants/global.constant';
import { NotebookDataSource } from '../../../../page-objects/data-sources/notebook-data-source.pageobject';

test.describe('Asset DataSource with Notebook Variable', () => {
    let dashboard: DashboardPage;
    let dataSource: NotebookDataSource;
    const assetDataSourceName = 'SystemLink Assets With Notebook Variable';
    const notebookDataSourceName = 'SystemLink Notebook for Asset Datasource';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSource = new NotebookDataSource(page);
        dashboard = new DashboardPage(page);

        await dataSource.addDataSource('SystemLink Assets', assetDataSourceName);
        await dataSource.dataSourceConnectedSuccessMessage.waitFor({ timeout: timeOutPeriod });
        await dataSource.addDataSource('SystemLink Notebooks', notebookDataSourceName);
        await dataSource.notebookDataSourceConnectedSuccessMessage.waitFor({ timeout: timeOutPeriod });
    });

    test.afterAll(async () => {
        await dataSource.deleteDataSource(assetDataSourceName);
        await dataSource.deleteDataSource(notebookDataSourceName);
    });

    test.describe.serial('Notebook Variable Integration', () => {
        test('should create dashboard with notebook variable', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);

            await dashboard.toolbar.settingsButton.click();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();

            await dashboard.settings.notebookVariable.nameInputField.fill('notebook_asset_id');
            await dashboard.settings.notebookVariable.selectDataSource(notebookDataSourceName);
            await pressEscape(dashboard.page);
            await dashboard.settings.notebookVariable.selectNotebookVariableDropdownOption('Asset List Notebook');
            await pressEscape(dashboard.page);
            await dashboard.settings.notebookVariable.applyVariableChanges();
            expect(dashboard.settings.createdVariable('notebook_asset_id')).toBeDefined();
        });

        test('should create asset visualization with List Assets query', async () => {
            await dashboard.settings.goBackToDashboardPage();
            await dashboard.addVisualization();
            await dashboard.selectDataSource(assetDataSourceName);

            await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', assetDataSourceName);
        });

        test('should add scan code property to the table', async () => {
            await dashboard.panel.assetQueryEditor.openQueryProperties();
            await dashboard.panel.assetQueryEditor.selectQueryProperty('id');
            await pressEscape(dashboard.page);
        });

        test('should filter assets by ID using notebook variable', async () => {
            await dashboard.panel.assetQueryEditor.addFilter('Asset Identifier', 'Equals', '$notebook_asset_id');

            await dashboard.panel.toolbar.switchToTableView();

            expect(await dashboard.panel.table.getTableRowCount()).toBe(1);
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.vendor_name, 'vendor1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.name, 'name1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.model_name, 'model1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.workspace, 'Default')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.location, 'System-1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.id, 'id1')).toBeTruthy();
        });

        test('should update filter when variable value changes', async () => {
            await dashboard.panel.toolbar.openVariableDropdown('id1', 'id2');
            await dashboard.panel.toolbar.refreshData();

            expect(await dashboard.panel.table.getTableRowCount()).toBe(1);
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.vendor_name, 'vendor2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.name, 'name2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.model_name, 'model2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.workspace, 'Workspace 2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.location, 'System-2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(assetColumn.id, 'id2')).toBeTruthy();
        });
    });
});
