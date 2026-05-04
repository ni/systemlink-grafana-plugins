import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcePage } from '../../../page-objects/data-sources/data-source.pageobject';
import { GRAFANA_URL } from '../../../config/environment';

test.describe('Workspace data source', () => {
    let dashboard: DashboardPage;
    let dataSources: DataSourcePage;
    const createdDataSourceName = 'Systemlink Workspaces General';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSources = new DataSourcePage(page);
        dashboard = new DashboardPage(page);
        await dataSources.addDataSource('SystemLink Workspaces', createdDataSourceName);
    });

    test.afterAll(async () => {
        await dataSources.deleteDataSource(createdDataSourceName);
    });

    test('should verify all workspaces are displayed correctly', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        expect(await dashboard.panel.table.checkColumnValue("name", 'Default', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue("name", 'Workspace 2', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue("name", 'Workspace 3', 2)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue("name", 'Workspace 4', 3)).toBeTruthy();
    });
});
