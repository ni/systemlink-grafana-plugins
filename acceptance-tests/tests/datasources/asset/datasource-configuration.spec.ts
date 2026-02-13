import { test, expect } from '@playwright/test';
import { DataSourcesPage } from '../../../page-objects/data-sources/data-sources.pageobject';
import { FAKE_API_URL } from '../../../config/environment';
import { timeOutPeriod } from '../../../constants/asset-list-properties.constant';

test.describe('Datasource Configuration', () => {
    let dataSource: DataSourcesPage;
    const dataSourceName = 'Systemlink Assets Configuration';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSource = new DataSourcesPage(page);
    });

    test.describe.serial('Creation and Deletion of SystemLink Assets data source', () => {
        test('should create a SystemLink Assets data source', async () => {
            await dataSource.navigateToDatasourcesPage();
            await dataSource.addDataSourceButton.click();
            await dataSource.dataSource('SystemLink Assets').click();
            await dataSource.nameSettingsInputField.waitFor({ state: 'visible', timeout: timeOutPeriod });
            await dataSource.httpSettingsURL.waitFor({ state: 'visible', timeout: timeOutPeriod });
            await dataSource.changeNameInputFieldValue(dataSourceName);

            await dataSource.httpSettingsURL.fill(FAKE_API_URL);
            await dataSource.saveAndTestButton.click();

            await expect(dataSource.dataSourceConnectedSuccessMessage).toBeVisible({ timeout: timeOutPeriod });

        });

        test('delete a SystemLink Assets data source', async () => {
            await dataSource.deleteDataSource(dataSourceName);
            await expect(dataSource.dataSourceSuccessMessage).toHaveText('Data source deleted', { timeout: timeOutPeriod });
        });
    });

    test('should show error message when trying to connect with wrong URL', async () => {
        await dataSource.navigateToDatasourcesPage();
        await dataSource.addDataSourceButton.click();
        await dataSource.dataSource('SystemLink Assets').click();
        await dataSource.nameSettingsInputField.waitFor({ state: 'visible', timeout: timeOutPeriod });
        await dataSource.httpSettingsURL.waitFor({ state: 'visible', timeout: timeOutPeriod });
        await dataSource.changeNameInputFieldValue(dataSourceName);
        await dataSource.httpSettingsURL.fill('http://wrong-url.com');
        await dataSource.saveAndTestButton.click();
        await expect(dataSource.dataSourceErrorMessage).toContainText("failed with status code: 502", { timeout: timeOutPeriod });
        await dataSource.deleteDataSource(dataSourceName);
    });
});
