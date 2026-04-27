import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { pressEscape } from '../../../../utils/keyboard-utilities';
import { timeOutPeriod } from '../../../../constants/global.constant';
import { NotebookDataSource } from '../../../../page-objects/data-sources/notebook-data-source.pageobject';

test.describe('Notebook DataSource with Asset Variable', () => {
    let dashboard: DashboardPage;
    let dataSource: NotebookDataSource;
    const notebookDataSourceName = 'SystemLink Notebook With Asset Variable';
    const assetDataSourceName = 'SystemLink Asset for Notebook Datasource';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSource = new NotebookDataSource(page);
        dashboard = new DashboardPage(page);

        await dataSource.addDataSource('SystemLink Assets', assetDataSourceName);
        await dataSource.dataSourceConnectedSuccessMessage.waitFor({ timeout: timeOutPeriod });
        await dataSource.addDataSource('SystemLink Notebooks', notebookDataSourceName);
    });

    test.afterAll(async () => {
        await dataSource.deleteDataSource(assetDataSourceName);
        await dataSource.deleteDataSource(notebookDataSourceName);
    });

    test.describe.serial('Asset Variable Integration', () => {
        test('should create dashboard with asset variable', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);

            await dashboard.toolbar.openSettings();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();
            await dashboard.settings.assetVariable.setVariableName('id');
            await dashboard.settings.assetVariable.selectDataSource(assetDataSourceName);
            await dashboard.settings.assetVariable.selectQueryReturnType('Asset Tag Path', 'Asset Id');
            await dashboard.settings.assetVariable.applyVariableChanges();
            expect(dashboard.settings.createdVariable('id')).toBeDefined();
        });
    });

    test('should create notebook visualization', async () => {
        await dashboard.settings.goBackToDashboardPage();
        await dashboard.addVisualization();
        await dashboard.selectDataSource(notebookDataSourceName);

        await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', notebookDataSourceName);
    });

    test('should configure notebook query with asset variable parameter', async () => {
        await dashboard.panel.notebookQueryEditor.selectNotebook('Asset Filter Notebook');
        await pressEscape(dashboard.page);
        await dashboard.panel.notebookQueryEditor.selectOutput('Decoy Output', 'Filtered Assets');

        await dashboard.panel.toolbar.switchToTableView();
        await expect(dashboard.panel.table.tableRow).toHaveCount(6, { timeout: timeOutPeriod });
    });
    test('should display assets filtered by variable in table', async () => {
        await dashboard.panel.notebookQueryEditor.fillParameterInput('$id');
        await expect(dashboard.panel.table.tableRow).toHaveCount(1, { timeout: timeOutPeriod });
        expect(await dashboard.panel.table.checkColumnValue('id', 'id1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('assetType', 'GENERIC')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('name', 'Asset 1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('minionId', 'minion-id1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('modelName', 'Model A')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('serialNumber', 'SN001')).toBeTruthy();
    });

    test('should update table data when variable value changes', async () => {
        await dashboard.panel.toolbar.openVariableDropdown('name1 (serial1)', 'name2 (serial2)');
        await dashboard.panel.toolbar.refreshData();

        await expect(dashboard.panel.table.tableRow).toHaveCount(1, { timeout: timeOutPeriod });
        expect(await dashboard.panel.table.checkColumnValue('id', 'id2')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('assetType', 'CALIBRATABLE')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('name', 'Asset 2')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('minionId', 'minion-id2')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('modelName', 'Model B')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('serialNumber', 'SN002')).toBeTruthy();
    });
});
