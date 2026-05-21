import { test, expect } from '@playwright/test';
import { FAKE_API_URL } from '../../../config/environment';
import { timeOutPeriod } from '../../../constants/global.constant';
import { NotebookDataSource } from '../../../page-objects/data-sources/notebook-data-source.pageobject';

test.describe('Datasource Configuration', () => {
    let dataSource: NotebookDataSource;
    const dataSourceName = 'Systemlink Notebooks Configuration';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSource = new NotebookDataSource(page);
    });

    test.describe.serial('Creation and Deletion of SystemLink Notebooks data source', () => {
        test('should create a SystemLink Notebooks data source', async () => {
            await dataSource.navigateToDatasourcesPage();
            await dataSource.addDataSourceButton.click();
            await dataSource.dataSource('SystemLink Notebooks').click();
            await dataSource.nameSettingsInputField.waitFor({ state: 'visible', timeout: timeOutPeriod });
            await dataSource.httpSettingsURL.waitFor({ state: 'visible', timeout: timeOutPeriod });
            await dataSource.changeNameInputFieldValue(dataSourceName);
            await dataSource.httpSettingsURL.fill(FAKE_API_URL);

            await dataSource.saveAndTestButton.click();

            await expect(dataSource.notebookDataSourceConnectedSuccessMessage).toBeVisible({ timeout: timeOutPeriod });
        });

        test('delete a SystemLink Notebooks data source', async () => {
            await dataSource.deleteDataSource(dataSourceName);

            await expect(dataSource.dataSourceSuccessMessage).toHaveText('Data source deleted', { timeout: timeOutPeriod });
        });
    });

    test('should show error message when trying to connect with wrong URL', async () => {
        await dataSource.navigateToDatasourcesPage();
        await dataSource.addDataSourceButton.click();
        await dataSource.dataSource('SystemLink Notebooks').click();
        await dataSource.nameSettingsInputField.waitFor({ state: 'visible', timeout: timeOutPeriod });
        await dataSource.httpSettingsURL.waitFor({ state: 'visible', timeout: timeOutPeriod });
        await dataSource.changeNameInputFieldValue(dataSourceName);
        await dataSource.httpSettingsURL.fill('http://wrong-url.com');

        await dataSource.saveAndTestButton.click();

        await expect(dataSource.dataSourceErrorMessage).toContainText("failed with status code: 502", { timeout: timeOutPeriod });

        await test.step('Cleanup datasource', async () => {
            await dataSource.deleteDataSource(dataSourceName);
        });
    });
});
