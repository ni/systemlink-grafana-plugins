import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { timeOutPeriod } from '../../../../constants/global.constant';
import { currentTagColumns } from '../../../../constants/tags.constants';
import { DataSourcePage } from '../../../../page-objects/data-sources/data-source.pageobject';

test.describe('Tag DataSource with Asset Variable', () => {
    let dashboard: DashboardPage;
    let dataSource: DataSourcePage;
    const tagDataSourceName = 'SystemLink Tags With Asset Variable';
    const assetDataSourceName = 'SystemLink Assets for Tag Datasource';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSource = new DataSourcePage(page);
        dashboard = new DashboardPage(page);

        await dataSource.addDataSource('SystemLink Assets', assetDataSourceName);
        await dataSource.dataSourceConnectedSuccessMessage.waitFor({ timeout: timeOutPeriod });
        await dataSource.addDataSource('SystemLink Tags', tagDataSourceName);
    });

    test.afterAll(async () => {
        await dataSource.deleteDataSource(assetDataSourceName);
        await dataSource.deleteDataSource(tagDataSourceName);
    });

    test.describe.serial('Asset Variable Integration', () => {
        test('should create dashboard with asset variable', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);

            await dashboard.toolbar.settingsButton.click();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();

            await dashboard.settings.assetVariable.nameInputField.fill('path');
            await dashboard.settings.assetVariable.selectDataSource(assetDataSourceName);
            await dashboard.settings.assetVariable.selectQueryReturnType('Asset Tag Path', 'Asset Tag Path');
            await dashboard.settings.assetVariable.applyVariableChanges();

            expect(dashboard.settings.createdVariable('path')).toBeDefined();
        });
    });

    test('should create tag visualization', async () => {
        await dashboard.settings.goBackToDashboardPage();
        await dashboard.addVisualization();
        await dashboard.selectDataSource(tagDataSourceName);

        await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', tagDataSourceName);
    });

    test('should load "current" query type tags based on asset variable', async () => {
        await dashboard.panel.tagQueryEditor.selectTagPath('$path.*');
        await dashboard.panel.toolbar.switchToTableView();

        await expect(dashboard.panel.table.tableColumns).toHaveCount(3, { timeout: timeOutPeriod });
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.name, 'Voltage', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.value, '12.1', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.updated, 'a day ago', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.name, 'Current', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.value, '3.50', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.updated, '3 days ago', 1)).toBeTruthy();

        await dashboard.panel.tagQueryEditor.toggleShowProperties();
        await expect(dashboard.panel.table.tableColumns).toHaveCount(5, { timeout: timeOutPeriod });
        expect(await dashboard.panel.table.checkColumnValue('displayName', 'Voltage', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('units', 'volt', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('displayName', 'Current', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('units', 'ampere', 1)).toBeTruthy();

        await dashboard.panel.tagQueryEditor.toggleShowTagPath();
        await expect(dashboard.panel.table.tableColumns).toHaveCount(6, { timeout: timeOutPeriod });
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.tag_path, 'Assets.vendor1.model1.serial1.Voltage', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.tag_path, 'Assets.vendor1.model1.serial1.Current', 1)).toBeTruthy();
    });

    test('should update "current" query type tags when asset variable changes', async () => {
        await dashboard.panel.toolbar.openVariableDropdown('name1 (serial1)', 'name2 (serial2)');
        await dashboard.panel.toolbar.refreshData();
        await expect(dashboard.panel.table.tableColumns).toHaveCount(5, { timeout: timeOutPeriod });
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.name, 'Assets.vendor2.model2.serial2.Volume', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.value, '4.10', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.updated, '2 days ago', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('units', 'liter', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.tag_path, 'Assets.vendor2.model2.serial2.Volume', 0)).toBeTruthy();
    });

    test('should load "historical" query type tags based on asset variable', async () => {
        await dashboard.panel.tagQueryEditor.selectHistoryQueryType();
        await dashboard.panel.toolbar.openDateTimePicker();
        await expect(dashboard.panel.table.tableColumns).toHaveCount(2, { timeout: timeOutPeriod });
        await dashboard.panel.toolbar.setTimeRange('2026-01-01 00:00:00', '2026-12-31 23:59:59', 'Coordinated Universal Time');
        expect(await dashboard.panel.table.checkColumnValue('time', '2026-04-24 08:00:00', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('time', '2026-04-24 08:15:00', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('time', '2026-04-24 08:30:00', 2)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Assets.vendor2.model2.serial2.Volume', '3.80 liter', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Assets.vendor2.model2.serial2.Volume', '4 liter', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Assets.vendor2.model2.serial2.Volume', '4.10 liter', 2)).toBeTruthy();
    });

    test('should update "historical" query type tags when asset variable changes', async () => {
        await dashboard.panel.toolbar.openVariableDropdown('name2 (serial2)', 'name1 (serial1)');
        await dashboard.panel.toolbar.refreshData();
        await expect(dashboard.panel.table.tableColumns).toHaveCount(3, { timeout: timeOutPeriod });
        expect(await dashboard.panel.table.checkColumnValue('time', '2026-04-24 08:15:00', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('time', '2026-04-24 08:30:00', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('time', '2026-04-24 08:45:00', 2)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('time', '2026-04-24 09:00:00', 3)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Voltage', '12 V', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Voltage', '12.1 V', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Voltage', '12.3 V', 2)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Voltage', '', 3)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Current', '', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Current', '', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Current', '3.60 ampere', 2)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Current', '3.80 ampere', 3)).toBeTruthy();
    });
});
