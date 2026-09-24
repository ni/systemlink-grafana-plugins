import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../config/environment';
import { DashboardPage } from '../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcePage } from '../../../page-objects/data-sources/data-source.pageobject';
import { workItemColumn, nonDefaultWorkItemProperties } from '../../../constants/work-items.constants';

test.describe('Work Items data source', () => {
    let dashboard: DashboardPage;
    let dataSource: DataSourcePage;
    const createdDataSourceName = 'Systemlink Work Items General';

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

    test('should verify all table data properties are correct', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectOnlyTypes(['Maintenance']);
        await dashboard.panel.workItemsQueryEditor.addSelectedPropertiesToTable(nonDefaultWorkItemProperties);

        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.id, 'WI-1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Work item name', 'Work Item 1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.type, 'Maintenance')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('State', 'New')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.substate, 'Pending review')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.description, 'Sample maintenance description')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.testProgram, 'Test Program A')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.partNumber, 'PN-1001')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.productName, 'Widget Tester')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.productId, 'product-1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.workspace, 'Default')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.assignedTo, 'Alice Anderson')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.requestedBy, 'Bob Baker')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.createdBy, 'Carol Clark')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.updatedBy, 'Dave Davis')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.parentWorkItemName, 'Parent Work Order')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.parentWorkItemId, 'WI-0')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.templateId, 'template-1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.estimatedDuration, '2 hr')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.plannedDuration, '8 hr')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.systemName, 'System-1')).toBeTruthy();
    });

    test('should filter work items by type', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectOnlyTypes(['Test plan']);

        await expect.poll(() => dashboard.panel.table.getTableRowCount()).toBe(1);
        expect(await dashboard.panel.table.checkColumnValue('Work item name', 'Work Item 2')).toBeTruthy();
    });

    test('should split a work item with multiple resource selections into separate rows', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectOnlyTypes(['Job']);
        await dashboard.panel.workItemsQueryEditor.addSelectedPropertiesToTable([
            workItemColumn.assetId,
            workItemColumn.targetLocation,
            workItemColumn.targetParent,
        ]);

        await expect.poll(() => dashboard.panel.table.getTableRowCount()).toBe(2);
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.assetId, 'ASSET-1', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.assetId, 'ASSET-2', 1)).toBeTruthy();

        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.targetLocationAsset, 'System-1', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.targetParentAsset, 'name1', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.targetLocationDut, 'System-3', 0)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.targetParentDut, 'name2', 0)).toBeTruthy();

        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.targetLocationAsset, 'System-2', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.targetParentAsset, 'name2', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.targetLocationDut, 'System-4', 1)).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue(workItemColumn.targetParentDut, 'name1', 1)).toBeTruthy();
    });

    test('should show total count per work item type', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectOnlyTypes(['Test plan', 'Job', 'Maintenance', 'Work order']);
        await dashboard.panel.workItemsQueryEditor.selectOutputType('Total Count');

        expect(await dashboard.panel.table.checkColumnValue('Test plan', '1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Job', '1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Maintenance', '1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Work order', '1')).toBeTruthy();
    });

    test('should show no data when the query is invalid due to no work item types selected', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectOnlyTypes([]);

        await expect.poll(() => dashboard.panel.table.getTableRowCount()).toBe(0);
    });

    test('should limit the number of results returned as per the Take value', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectOnlyTypes(['Test plan', 'Job', 'Maintenance']);
        await expect.poll(() => dashboard.panel.table.getTableRowCount()).toBe(4);

        await dashboard.panel.workItemsQueryEditor.setTake(2);
        await expect.poll(() => dashboard.panel.table.getTableRowCount()).toBe(2);
    });

    test('should display custom properties using their property name as the column header', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectOnlyTypes(['Maintenance']);
        await dashboard.panel.workItemsQueryEditor.addSelectedPropertiesToTable(['priority']);

        expect(await dashboard.panel.table.checkColumnValue('priority', 'High')).toBeTruthy();
    });
});
