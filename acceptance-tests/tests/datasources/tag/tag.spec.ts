import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../config/environment';
import { DashboardPage } from '../../../page-objects/dashboard/dashboard.pageobject';
import { timeOutPeriod } from '../../../constants/global.constant';
import { currentTagColumns } from '../../../constants/tags.constants';
import { DataSourcePage } from '../../../page-objects/data-sources/data-source.pageobject';

test.describe('Tag DataSource with Asset Variable', () => {
    let dashboard: DashboardPage;
    let dataSource: DataSourcePage;
    const tagDataSourceName = 'SystemLink Tags General';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSource = new DataSourcePage(page);
        dashboard = new DashboardPage(page);

        await dataSource.addDataSource('SystemLink Tags', tagDataSourceName);
    });

    test.afterAll(async () => {
        await dataSource.deleteDataSource(tagDataSourceName);
    });

    test.describe.serial('Tag data source with static tag path', () => {
        test('should create tag visualization', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);

            await dashboard.addVisualization();
            await dashboard.selectDataSource(tagDataSourceName);

            await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', tagDataSourceName);
        });

        test('should load "current" query type tag', async () => {
            await dashboard.panel.tagQueryEditor.selectTagPath('Assets.vendor1.model1.serial1.Current');
            await dashboard.panel.toolbar.switchToTableView();

            await expect(dashboard.panel.table.tableColumns).toHaveCount(3, { timeout: timeOutPeriod });
            expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.name, 'Current', 0)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.value, '3.50', 0)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.updated, '3 days ago', 0)).toBeTruthy();

            await dashboard.panel.tagQueryEditor.toggleShowProperties();

            await expect(dashboard.panel.table.tableColumns).toHaveCount(5, { timeout: timeOutPeriod });
            expect(await dashboard.panel.table.checkColumnValue('displayName', 'Current', 0)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue('units', 'ampere', 0)).toBeTruthy();

            await dashboard.panel.tagQueryEditor.toggleShowTagPath();

            await expect(dashboard.panel.table.tableColumns).toHaveCount(6, { timeout: timeOutPeriod });
            expect(await dashboard.panel.table.checkColumnValue(currentTagColumns.tag_path, 'Assets.vendor1.model1.serial1.Current', 0)).toBeTruthy();
        });

        test('should load "historical" query type tag', async () => {
            await dashboard.panel.tagQueryEditor.selectHistoryQueryType();
            await dashboard.panel.toolbar.openDateTimePicker();
            await expect(dashboard.panel.table.tableColumns).toHaveCount(2, { timeout: timeOutPeriod });

            await dashboard.panel.toolbar.setTimeRange('2026-01-01 00:00:00', '2026-12-31 23:59:59', 'Coordinated Universal Time');

            expect(await dashboard.panel.table.checkColumnValue('time', '2026-04-24 08:45:00', 0)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue('time', '2026-04-24 09:00:00', 1)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue('Current', '3.60 ampere', 0)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue('Current', '3.80 ampere', 1)).toBeTruthy();
        });
    });
});
