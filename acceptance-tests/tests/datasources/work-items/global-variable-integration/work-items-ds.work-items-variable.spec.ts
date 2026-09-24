import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcePage } from '../../../../page-objects/data-sources/data-source.pageobject';

test.describe('Work Items DataSource with Work Item Variable', () => {
    let dashboard: DashboardPage;
    let dataSource: DataSourcePage;
    const createdDataSourceName = 'SystemLink Work Items With Variable';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSource = new DataSourcePage(page);
        dashboard = new DashboardPage(page);
        await dataSource.addDataSource('SystemLink Work Items', createdDataSourceName);
    });

    test.afterAll(async () => {
        await dataSource.deleteDataSource(createdDataSourceName);
    });

    test.describe.serial('Work item variable integration', () => {
        test('should create a work item variable using the default list work items query type', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);

            await dashboard.toolbar.openSettings();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();
            await dashboard.settings.workItemsVariable.setVariableName('workItemsList');
            await dashboard.settings.workItemsVariable.selectDataSource(createdDataSourceName);
            await dashboard.settings.workItemsVariable.runQuery();

            await expect(dashboard.page.getByText('Work Item 1 (WI-1)')).toBeVisible();

            await dashboard.settings.workItemsVariable.applyVariableChanges();

            expect(dashboard.settings.createdVariable('workItemsList')).toBeDefined();

            await dashboard.settings.goBackToDashboardPage();
        });

        test('should create a work item variable using the list work item types query type', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);

            await dashboard.toolbar.openSettings();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();
            await dashboard.settings.workItemsVariable.setVariableName('workItemTypes');
            await dashboard.settings.workItemsVariable.selectDataSource(createdDataSourceName);
            await dashboard.settings.workItemsVariable.selectQueryType('List work item types');
            await dashboard.settings.workItemsVariable.applyVariableChanges();

            expect(dashboard.settings.createdVariable('workItemTypes')).toBeDefined();

            await dashboard.settings.goBackToDashboardPage();
        });

        test('should filter the work items panel using the created variable', async () => {
            await dashboard.createFirstVisualization(createdDataSourceName);
            await dashboard.panel.workItemsQueryEditor.selectOnlyTypes(['$workItemTypes']);
            await dashboard.panel.toolbar.switchToTableView();

            await expect.poll(() => dashboard.panel.table.getTableRowCount()).toBe(5);
        });
    });
});
