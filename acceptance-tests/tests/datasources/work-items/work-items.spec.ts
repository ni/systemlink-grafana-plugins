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

        await dashboard.panel.workItemsQueryEditor.selectTypes(['Maintenance']);
        await dashboard.panel.workItemsQueryEditor.selectProperties(nonDefaultWorkItemProperties);

        const expectedColumnValues: Record<string, string> = {
            [workItemColumn.id]: 'WI-1',
            [workItemColumn.name]: 'Work Item 1',
            [workItemColumn.type]: 'Maintenance',
            [workItemColumn.state]: 'New',
            [workItemColumn.substate]: 'Pending review',
            [workItemColumn.description]: 'Sample maintenance description',
            [workItemColumn.testProgram]: 'Test Program A',
            [workItemColumn.partNumber]: 'PN-1001',
            [workItemColumn.productName]: 'Widget Tester',
            [workItemColumn.productId]: 'product-1',
            [workItemColumn.workspace]: 'Default',
            [workItemColumn.assignedTo]: 'Alice Anderson',
            [workItemColumn.requestedBy]: 'Bob Baker',
            [workItemColumn.createdBy]: 'Carol Clark',
            [workItemColumn.updatedBy]: 'Dave Davis',
            [workItemColumn.parentWorkItemName]: 'Parent Work Order',
            [workItemColumn.parentWorkItemId]: 'WI-0',
            [workItemColumn.templateId]: 'template-1',
            [workItemColumn.estimatedDuration]: '2 hr',
            [workItemColumn.plannedDuration]: '8 hr',
            [workItemColumn.systemName]: 'System-1',
        };
        for (const [column, value] of Object.entries(expectedColumnValues)) {
            expect(await dashboard.panel.table.checkColumnValue(column, value)).toBeTruthy();
        }
    });

    test('should filter work items by type', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectTypes(['Test plan']);

        await expect.poll(() => dashboard.panel.table.getTableRowCount()).toBe(1);
        expect(await dashboard.panel.table.checkColumnValue('Work item name', 'Work Item 2')).toBeTruthy();
    });

    test('should split a work item with multiple resource selections into separate rows', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectTypes(['Job']);
        await dashboard.panel.workItemsQueryEditor.selectProperties([
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

        await dashboard.panel.workItemsQueryEditor.selectTypes(['Test plan', 'Job', 'Maintenance', 'Work order']);
        await dashboard.panel.workItemsQueryEditor.selectOutputType('Total Count');

        expect(await dashboard.panel.table.checkColumnValue('Test plan', '1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Job', '1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Maintenance', '1')).toBeTruthy();
        expect(await dashboard.panel.table.checkColumnValue('Work order', '1')).toBeTruthy();
    });

    test('should show a validation error when no work item types are selected', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectTypes([]);

        await expect(dashboard.page.getByText('You must select at least one type.')).toBeVisible();
    });

    test('should limit the number of results returned as per the Take value', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectTypes(['Test plan', 'Job', 'Maintenance']);
        await expect.poll(() => dashboard.panel.table.getTableRowCount()).toBe(4);

        await dashboard.panel.workItemsQueryEditor.setTake(2);
        await expect.poll(() => dashboard.panel.table.getTableRowCount()).toBe(2);
    });

    test('should display custom properties using their property name as the column header', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.createFirstVisualization(createdDataSourceName);
        await dashboard.panel.toolbar.switchToTableView();

        await dashboard.panel.workItemsQueryEditor.selectTypes(['Maintenance']);
        await dashboard.panel.workItemsQueryEditor.selectProperties(['priority']);

        expect(await dashboard.panel.table.checkColumnValue('priority', 'High')).toBeTruthy();
    });
});
