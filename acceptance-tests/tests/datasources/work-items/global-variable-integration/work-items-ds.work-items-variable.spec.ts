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
        test.only('should create a work item variable using the list work items query type', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);

            await dashboard.toolbar.openSettings();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();
            await dashboard.settings.workItemsVariable.setVariableName('workItemId');
            await dashboard.settings.workItemsVariable.selectDataSource(createdDataSourceName);
            await dashboard.settings.workItemsVariable.applyVariableChanges();

            expect(dashboard.settings.createdVariable('workItemId')).toBeDefined();

            await dashboard.settings.goBackToDashboardPage();
        });

        // test('should filter the work items panel using the created variable', async () => {
        //     await dashboard.variableDropdown('Parent Work Order (WI-0)').click();
        //     await dashboard.variableDropdownOption('Work Item 1 (WI-1)').click();
        //     await dashboard.page.keyboard.press('Escape');

        //     await dashboard.createFirstVisualization(createdDataSourceName);
        //     await dashboard.panel.toolbar.switchToTableView();

        //     await dashboard.panel.workItemsQueryEditor.addFilter('ID', 'equals', '$workItemId');

        //     await expect.poll(() => dashboard.panel.table.getTableRowCount()).toBe(1);
        //     expect(await dashboard.panel.table.checkColumnValue('Work item name', 'Work Item 1')).toBeTruthy();
        // });
    });
});
