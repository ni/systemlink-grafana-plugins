import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcesPage } from '../../../../page-objects/data-sources/data-sources.pageobject';
import { pressEscape } from '../../../../utils/keyboard-utilities';
import { interceptApiRoute } from '../../../../utils/intercept-api-route';

interface CalibrationForecastResponse {
    calibrationForecast: {
        columns: (TimeColumn | CountColumn)[];
    };
}

interface TimeColumn {
    name: string;
    columnDescriptors: Array<{ type: 'Time'; value: string }>;
    values: string[];
}

interface CountColumn {
    name: string;
    columnDescriptors: Array<{ type: 'Count'; value: string }>;
    values: number[];
}

test.describe('Calibration Forecast', () => {
    let dashboard: DashboardPage;
    let dataSources: DataSourcesPage;
    let createdDataSourceName = 'Systemlink Assets Calibration Forecast';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSources = new DataSourcesPage(page);
        dashboard = new DashboardPage(page);
        await dataSources.addDataSource('SystemLink Assets', createdDataSourceName);
    });

    test.afterAll(async () => {
        await dataSources.deleteDataSource(createdDataSourceName);
    });

    test('should create a Systemlink Assets visualization with Calibration Forecast', async () => {
        await dashboard.page.goto(`${GRAFANA_URL}/dashboard/new`);
        await dashboard.addVisualizationButton.waitFor();
        await dashboard.addVisualization();
        await dashboard.selectDataSource(createdDataSourceName);

        await expect(dashboard.dataSourcePicker).toHaveAttribute('placeholder', createdDataSourceName);
    });


    test('should display calibration forecast grouped by month with filter', async () => {
        await dashboard.panel.assetQueryEditor.selectQueryType('Calibration Forecast');
        await pressEscape(dashboard.page);
        await dashboard.panel.assetQueryEditor.selectGroupBy('Month');
        await dashboard.panel.assetQueryEditor.addFilter('Asset Type', 'equals', 'Device under test');
        await dashboard.panel.assetQueryEditor.openDateTimePicker();
        await dashboard.panel.assetQueryEditor.setTimeRange('2026-03-01 00:00:00', '2026-03-31 23:59:59');

        const [forecastResponse] = await Promise.all([
            interceptApiRoute<CalibrationForecastResponse>(dashboard.page, '**/niapm/v1/assets/calibration-forecast'),
            dashboard.panel.assetQueryEditor.refreshData()
        ]);

        await dashboard.panel.assetQueryEditor.switchToTableView();
        await dashboard.panel.table.getTable.waitFor({ timeout: 10000 });

        expect(forecastResponse).toBeDefined();
        expect(forecastResponse.calibrationForecast.columns).toBeDefined();

        const assetsColumn = forecastResponse.calibrationForecast.columns.find(
            col => col.name === 'Assets' && col.columnDescriptors?.[0]?.type === 'Count'
        ) as CountColumn;

        expect(assetsColumn).toBeDefined();
        expect(assetsColumn.values.length).toBe(2);

        const tableRowCount = await dashboard.panel.table.getTableRowCount();
        expect(tableRowCount).toBe(2);

        const assetsColumnIndex = await dashboard.panel.table.getSelectedColumnIndex('Assets');

        for (let rowIndex = 0; rowIndex < assetsColumn.values.length; rowIndex++) {
            const expectedValue = assetsColumn.values[rowIndex].toString();
            const actualValue = await dashboard.panel.table.getCellInRowByIndex(rowIndex, assetsColumnIndex);
            expect(actualValue).toBe(expectedValue);
        }
    });
});
