import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { systemsColumn } from '../../../../constants/systems-properties.constant';
import { timeOutPeriod } from '../../../../constants/global.constant';
import { pressEnter } from '../../../../utils/keyboard-utilities';
import { SystemDataSource } from '../../../../page-objects/data-sources/systems-data-source.pageobject';

test.describe('Systems data source with scan code return type', () => {
    let dashboard: DashboardPage;
    let dataSources: SystemDataSource;
    let createdDataSourceName = 'Systemlink Systems Scan Code Return Type';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSources = new SystemDataSource(page);
        dashboard = new DashboardPage(page);
        await dataSources.addDataSource('SystemLink Systems', createdDataSourceName);
    });

    test.afterAll(async () => {
        await dataSources.deleteDataSource(createdDataSourceName);
    });

    test.describe.serial('Scan code variable return type', () => {
        test('create a system variable with scanCode return type', async () => {
            await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);

            await dashboard.toolbar.openSettings();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();
            await dashboard.settings.systemVariable.setVariableName('scanCode');
            await dashboard.settings.systemVariable.selectDataSource(createdDataSourceName);
            await dashboard.settings.systemVariable.selectQueryReturnType('Minion Id', 'Scan Code');
            await dashboard.settings.systemVariable.applyVariableChanges();

            expect(dashboard.settings.createdVariable('scanCode')).toBeDefined();

        });

        test('should add a complex filter to the created systems variable', async () => {
            await dashboard.settings.editVariable('scanCode');
            await dashboard.settings.systemVariable.addFilterByTypingPropertyName('Connection status', 'equals', 'Connected');

            await dashboard.settings.systemVariable.addFilterGroup('And');
            await dashboard.settings.systemVariable.addFilterByTypingPropertyName('Workspace', 'equals', 'Default');
            await pressEnter(dashboard.page);

            await dashboard.settings.systemVariable.addFilterGroup('Or');
            await dashboard.settings.systemVariable.addFilterByTypingPropertyName('Model', 'equals', 'Model8');
            await pressEnter(dashboard.page);
        });

        test('should create a Systemlink Systems visualization', async () => {
            await dashboard.settings.goBackToDashboardPage();
            await dashboard.addVisualizationButton.waitFor();
            await dashboard.addVisualization();
            await dashboard.selectDataSource(createdDataSourceName);
            await dashboard.panel.systemsQueryEditor.switchToTableView();

            await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', createdDataSourceName);
        });

        test('should add filter by scanCode using the system variable', async () => {
            await dashboard.panel.systemsQueryEditor.selectQueryType('Properties');
            await dashboard.panel.systemsQueryEditor.addFilterByTypingPropertyName('Scan code', 'equals', '$scanCode');

            await expect(dashboard.panel.table.firstFilterRow).toContainText('Scan code');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('equals');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('$scanCode');
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
            await dashboard.panel.systemsQueryEditor.openVariableDropdown('System-1', 'System-8');
            await dashboard.panel.toolbar.refreshData();

            rowCount = await dashboard.panel.table.getTableRowCount();

            expect(rowCount).toBe(1);
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.id, 'SYSTEM-8')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.alias, 'System-8')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.connection_status, 'CONNECTED_REFRESH_PENDING')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.locked_status, 'false')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.system_start_time, '2026-01-21T16:59:31.000Z')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.model, 'Model8')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.vendor, 'Vendor8')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.operating_system, 'OS8')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.ip_address, '10.8.0.1')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.workspace, 'Workspace 2')).toBeTruthy();
            expect(await dashboard.panel.table.checkColumnValue(systemsColumn.scan_code, 'scanCode8')).toBeTruthy();
        });
    });
});
