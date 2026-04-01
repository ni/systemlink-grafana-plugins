import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { systemsColumn } from '../../../../constants/systems-properties.constant';
import { timeOutPeriod } from '../../../../constants/global.constant';
import { pressEnter } from '../../../../utils/keyboard-utilities';
import { SystemDataSource } from '../../../../page-objects/data-sources/systems-data-source.pageobject';

test.describe('Systems data source with minion id return type', () => {
    let dashboard: DashboardPage;
    let dataSource: SystemDataSource;
    let createdDataSourceName = 'Systemlink Systems Minion Id Return Type';

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

    test.describe.serial('Minion id variable return type', () => {
        test('create a system variable with minionId return type', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);

            await dashboard.toolbar.openSettings();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();
            await dashboard.settings.systemVariable.setVariableName('id');
            await dashboard.settings.systemVariable.selectDataSource(createdDataSourceName);
            await dashboard.settings.systemVariable.selectQueryReturnType('Minion Id', 'Minion Id');
            await dashboard.settings.systemVariable.applyVariableChanges();

            expect(dashboard.settings.createdVariable('id')).toBeDefined();

        });

        test('should create a Systemlink Systems visualization', async () => {
            await dashboard.settings.goBackToDashboardPage();
            await dashboard.addVisualizationButton.waitFor();
            await dashboard.addVisualization();
            await dashboard.selectDataSource(createdDataSourceName);
            await dashboard.panel.toolbar.switchToTableView();

            await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', createdDataSourceName);
        });

        test('should add filter by minionId using the system variable', async () => {
            await dashboard.panel.systemsQueryEditor.selectQueryType('Properties');
            await dashboard.panel.systemsQueryEditor.addFilterByTypingPropertyName('Minion ID', 'equals', '$id');

            await expect(dashboard.panel.table.firstFilterRow).toContainText('Minion ID');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('equals');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('$id');
        });

        test('should verify that table data changes as the variable value changes', async () => {
            await dashboard.panel.table.getTable.first().waitFor({ state: 'visible', timeout: timeOutPeriod });

            let rowCount = await dashboard.panel.table.getTableRowCount();

            expect(rowCount).toBe(1);
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.id, 'SYSTEM-1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.alias, 'System-1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.connection_status, 'CONNECTED')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.locked_status, 'false')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.system_start_time, '2025-12-18T16:59:31.000Z')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.model, 'Model1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.vendor, 'Vendor1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.operating_system, 'OS1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.ip_address, '172.10.1.37')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.workspace, 'Default')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.scan_code, 'scanCode1')).toBeTruthy();
            await dashboard.panel.systemsQueryEditor.openVariableDropdown('System-1', 'System-2');
            await dashboard.panel.toolbar.refreshData();

            rowCount = await dashboard.panel.table.getTableRowCount();

            expect(rowCount).toBe(1);
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.id, 'SYSTEM-2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.alias, 'System-2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.connection_status, 'DISCONNECTED')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.locked_status, 'false')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.system_start_time, '2025-01-8T16:59:31.000Z')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.model, 'Model2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.vendor, 'Vendor2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.operating_system, 'OS2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.ip_address, '10.5.136.55')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.workspace, 'Default')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.scan_code, 'scanCode2')).toBeTruthy();
        });

        test('should add complex filter', async () => {
            await dashboard.panel.systemsQueryEditor.addFilterGroup('And');
            await dashboard.panel.systemsQueryEditor.addFilterByTypingPropertyName('Connection status', 'equals', 'Disconnected');
            await pressEnter(dashboard.page);

            await expect(dashboard.panel.table.secondFilterRow).toContainText('Connection status');
            await expect(dashboard.panel.table.secondFilterRow).toContainText('equals');
            await expect(dashboard.panel.table.secondFilterRow).toContainText('Disconnected');

            await dashboard.panel.systemsQueryEditor.addFilterGroup('Or');
            await dashboard.panel.systemsQueryEditor.addFilterByTypingPropertyName('Locked status', 'equals', 'True');
            await pressEnter(dashboard.page);

            await expect(dashboard.panel.table.thirdFilterRow).toContainText('Locked status');
            await expect(dashboard.panel.table.thirdFilterRow).toContainText('equals');
            await expect(dashboard.panel.table.thirdFilterRow).toContainText('True');
        });

        test('should verify that table data changes as the complex filter was added', async () => {
            let rowCount = await dashboard.panel.table.getTableRowCount();

            expect(rowCount).toBe(2);
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.id, 'SYSTEM-2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.alias, 'System-2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.connection_status, 'DISCONNECTED')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.locked_status, 'false')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.system_start_time, '2025-01-8T16:59:31.000Z')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.model, 'Model2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.vendor, 'Vendor2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.operating_system, 'OS2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.ip_address, '10.5.136.55')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.workspace, 'Default')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.scan_code, 'scanCode2')).toBeTruthy();

            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.id, 'SYSTEM-6', 1)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.alias, 'System-6', 1)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.connection_status, 'CONNECTED', 1)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.locked_status, 'true', 1)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.system_start_time, '2025-06-21T16:59:31.000Z', 1)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.model, 'Model6', 1)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.vendor, 'Vendor6', 1)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.operating_system, 'OS6', 1)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.ip_address, '10.6.0.1', 1)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.workspace, 'Default', 1)).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.scan_code, 'scanCode6', 1)).toBeTruthy();
        });
    });
});
