import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../../config/environment';
import { DashboardPage } from '../../../../page-objects/dashboard/dashboard.pageobject';
import { DataSourcePage } from '../../../../page-objects/data-sources/data-source.pageobject';
import { pressEscape } from '../../../../utils/keyboard-utilities';
import { interceptApiRoute } from '../../../../utils/intercept-api-route';
import { CalibrationForecastResponse, FieldDTOWithDescriptor } from '../../../../../src/datasources/asset/types/CalibrationForecastQuery.types';
import { timeOutPeriod } from '../../../../constants/global.constant';

test.describe('Calibration Forecast', () => {
    let dashboard: DashboardPage;
    let dataSources: DataSourcePage;
    let createdDataSourceName = 'Systemlink Assets Calibration Forecast';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSources = new DataSourcePage(page);
        dashboard = new DashboardPage(page);
        await dataSources.addDataSource('SystemLink Assets', createdDataSourceName);
    });

    test.afterAll(async () => {
        await dataSources.deleteDataSource(createdDataSourceName);
    });

    test.describe.serial('Calibration Forecast query', () => {
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
            await dashboard.panel.toolbar.openDateTimePicker();
            await dashboard.panel.toolbar.setTimeRange('2026-03-01 00:00:00', '2026-03-31 23:59:59', 'Coordinated Universal Time');

            const [forecastResponse] = await Promise.all([
                interceptApiRoute<CalibrationForecastResponse>(dashboard.page, '**/niapm/v1/assets/calibration-forecast'),
                dashboard.panel.toolbar.refreshData()
            ]);

            await dashboard.panel.toolbar.switchToTableView();
            await dashboard.panel.table.getTableBody.waitFor({ timeout: timeOutPeriod });

            expect(forecastResponse).toBeDefined();
            expect(forecastResponse.calibrationForecast.columns).toBeDefined();

            const assetsColumn = forecastResponse.calibrationForecast.columns.find(
                column => column.name === 'Assets' && column.columnDescriptors?.[0]?.type === 'COUNT'
            ) as FieldDTOWithDescriptor;

            expect(assetsColumn).toBeDefined();
            expect(assetsColumn.values).toBeDefined();
            expect(assetsColumn.values!.length).toBe(1);

            const tableRowCount = await dashboard.panel.table.getTableRowCount();
            expect(tableRowCount).toBe(1);
            expect(await dashboard.panel.table.checkColumnValue('Month', 'March 2026', 0)).toBeTruthy();

            for (let rowIndex = 0; rowIndex < assetsColumn.values!.length; rowIndex++) {
                const expectedValue = assetsColumn.values![rowIndex].toString();
                expect(await dashboard.panel.table.checkColumnValue('Assets', expectedValue, rowIndex)).toBeTruthy();
            }
        });
    });
});
