import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { interceptApiRoute } from '../../../../utils/intercept-api-route';
import { SystemSummary } from '../../../../../src/datasources/system/types.ts';
import { timeOutPeriod } from '../../../../constants/global.constant';
import { SystemDataSource } from '../../../../page-objects/data-sources/systems-data-source.pageobject.ts';

test.describe('System Summary Table', () => {
    let dashboard: DashboardPage;
    let dataSource: SystemDataSource;
    let createdDataSourceName = 'Systemlink System Summary Table';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSource = new SystemDataSource(page);
        dashboard = new DashboardPage(page);
        await dataSource.addDataSource('SystemLink Systems', createdDataSourceName);
    });

    test.afterAll(async () => {
        await dataSource.deleteDataSource(createdDataSourceName);
    });

    test.describe.serial('System Summary query', () => {
        test('should create a Systemlink Systems visualization', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
            await dashboard.addVisualizationButton.waitFor();
            await dashboard.addVisualization();
            await dashboard.selectDataSource(createdDataSourceName);
            await dashboard.panel.toolbar.switchToTableView();

            await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', createdDataSourceName);
        });

        test('should display correct system summary values', async () => {
            const [systemSummaryResponse] = await Promise.all([
                interceptApiRoute<SystemSummary>(dashboard.page, '**/nisysmgmt/v1/get-systems-summary'),
                dashboard.panel.toolbar.refreshButton.click()
            ]);

            await dashboard.panel.table.getTableBody.waitFor({ timeout: timeOutPeriod });

            expect(systemSummaryResponse).toBeDefined();
            expect(await dashboard.panel.table.getTableRowCount()).toBe(1);
            expect(await dashboard.panel.table.checkColumnValue('Connected', systemSummaryResponse.connectedCount.toString())).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue('Disconnected', systemSummaryResponse.disconnectedCount.toString())).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue('Virtual', systemSummaryResponse.virtualCount.toString())).toBeTruthy();
        });
    });
});
