import { test, expect } from '@playwright/test';
import { BASE_URL, FAKE_API_URL } from '../../../config/environment';
import { DashboardPage } from '../../../page-objects/dashboard/dashboard.pageobject';

test.describe('Asset data source with asset var iable', () => {
    let dashboard: DashboardPage;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dashboard = new DashboardPage(page);
    });

    test('should create a SystemLink Assets data source', async () => {
        await dashboard.page.goto(`${BASE_URL}/connections/datasources/new`);
        await dashboard.page.click('button:has-text("SystemLink Assets")');

        await dashboard.page.waitForSelector('text=HTTP');

        await dashboard.page.getByTestId('data-testid Datasource HTTP settings url').fill(FAKE_API_URL);

        await dashboard.page.click('button:has-text("Save & test")');
        await expect(dashboard.page.locator('text=Data source connected and authentication successful!')).toBeVisible({ timeout: 10000 });
    });

    test.describe.serial('Minion id variable return type', () => {
        test('create an asset variable with minionId return type', async () => {
            await dashboard.page.goto(`${BASE_URL}/dashboard/new`);

            await dashboard.toolbar.openSettings();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();
            await dashboard.settings.variable.setVariableName('id');
            await dashboard.settings.variable.selectDataSource('ni-slasset-datasource default');
            await dashboard.settings.variable.selectQueryReturnType('Asset Id');
            await dashboard.settings.variable.applyVariableChanges();

            expect(dashboard.settings.createdVariable('id')).toBeDefined();

        });

        test('should create a Systemlink Assets visualization', async () => {
            await dashboard.settings.goBackToDashboardPage();
            await dashboard.addVisualizationButton.waitFor();
            await dashboard.addVisualization();
            await dashboard.selectDataSource('ni-slasset-datasource default');
            await dashboard.panel.assetQueryEditor.switchToTableView();

            await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', 'ni-slasset-datasource');
        });

        test('should add filter by minionId using the asset variable', async () => {
            await dashboard.panel.assetQueryEditor.addFilter('Asset Identifier', 'equals', '$id');

            await expect(dashboard.panel.table.firstFilterRow).toContainText('Asset Identifier');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('equals');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('$id');
        });

        test('should verify that table data changes as the variable value changes', async () => {
            await dashboard.panel.table.getTable.first().waitFor({ state: 'visible', timeout: 10000 });

            let cellCount = await dashboard.panel.table.getTableCellCount();

            expect(cellCount).toBe(5);
            await expect(dashboard.panel.table.cellValue('Acme')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('SDFGSDFG234')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('ABCD')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('Default')).toBeVisible();

            await dashboard.panel.assetQueryEditor.openVariableDropdown('SDFGSDFG234 (SDFGSDFG234)', 'rsctest-9047 (01CEE362)');
            await dashboard.panel.assetQueryEditor.refreshData();

            cellCount = await dashboard.panel.table.getTableCellCount();

            expect(cellCount).toBe(5);
            await expect(dashboard.panel.table.cellValue('National Instruments')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('rsctest-9047')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('cRIO-9047')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('Workspace 2')).toBeVisible();
        });
    });

    test.describe.serial('Scan code variable return type', () => {
        test('create an asset variable with scan code return type', async () => {
            await dashboard.page.goto(`${BASE_URL}/dashboard/new`);

            await dashboard.toolbar.openSettings();
            await dashboard.settings.goToVariablesTab();
            await dashboard.settings.addNewVariable();
            await dashboard.settings.variable.setVariableName('scanCode');
            await dashboard.settings.variable.selectDataSource('ni-slasset-datasource default');
            await dashboard.settings.variable.selectQueryReturnType('Scan Code');
            await dashboard.settings.variable.applyVariableChanges();

            expect(dashboard.settings.createdVariable('scanCode')).toBeDefined();

        });

        test('should create a Systemlink Assets visualization', async () => {
            await dashboard.settings.goBackToDashboardPage();
            await dashboard.addVisualizationButton.waitFor();
            await dashboard.addVisualization();
            await dashboard.selectDataSource('ni-slasset-datasource default');
            await dashboard.panel.assetQueryEditor.switchToTableView();

            await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', 'ni-slasset-datasource');
        });

        test('should add scan code property to the table', async () => {
            await dashboard.panel.assetQueryEditor.openQueryProperties();
            await dashboard.panel.assetQueryEditor.selectQueryProperty('scan code');
        });

        test('should add filter by scanCode using the asset variable', async () => {
            await dashboard.panel.assetQueryEditor.addFilter('Scan Code', 'equals', '$scanCode');

            await expect(dashboard.panel.table.firstFilterRow).toContainText('Scan Code');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('equals');
            await expect(dashboard.panel.table.firstFilterRow).toContainText('$scanCode');
        });

        test('should verify that table data changes as the variable value changes', async () => {
            await dashboard.panel.table.getTable.first().waitFor({ state: 'visible', timeout: 10000 });

            let cellCount = await dashboard.panel.table.getTableCellCount();

            expect(cellCount).toBe(6);
            await expect(dashboard.panel.table.cellValue('Acme')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('SDFGSDFG234')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('ABCD')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('Default')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('c44750b7-1f22-4fec-b475-73b10e966217')).toBeVisible();

            await dashboard.panel.assetQueryEditor.openVariableDropdown('SDFGSDFG234 (SDFGSDFG234)', 'Energizer MAX AA DUT 5 (1238)');
            await dashboard.panel.assetQueryEditor.refreshData();

            cellCount = await dashboard.panel.table.getTableCellCount();

            expect(cellCount).toBe(6);
            await expect(dashboard.panel.table.cellValue('GM')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('Energizer MAX AA DUT 5')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('HR-3UTG-AMZN')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('Default')).toBeVisible();
            await expect(dashboard.panel.table.cellValue('1b5c6cfa-2c89-4f12-894b-c07106c04848')).toBeVisible();
        });
    });

    test('should remove the SystemLink Assets data source', async () => {
        await dashboard.page.goto(`${BASE_URL}/connections/datasources`);

        await dashboard.page.getByRole('link', { name: 'ni-slasset-datasource', exact: true }).click();
        await dashboard.page.getByTestId('Data source settings page Delete button').click();
        await dashboard.page.getByTestId('data-testid Confirm Modal Danger Button').click();

        await expect(dashboard.page.locator('text=Data source deleted')).toBeVisible({ timeout: 10000 });
    });
});