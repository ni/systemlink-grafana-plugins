import { test, expect } from '@playwright/test';
import { DataSourcesPage } from '../../../page-objects/data-sources/data-sources.pageobject';
import { FAKE_API_URL } from '../../../config/environment';

test.describe('Datasource Configuration', () => {
    let dataSource: DataSourcesPage;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSource = new DataSourcesPage(page);
    });

    test.describe.serial('Creation and Deletion of SystemLink Assets data source', () => {
        let dataSourceName = '';
        test('should create a SystemLink Assets data source', async () => {
            await dataSource.navigateToDatasourcesPage();
            const hasAddDataSource = await dataSource.addDataSourceButton.isVisible({ timeout: 1000 }).catch(() => false);
            if (hasAddDataSource) {
                await dataSource.addDataSourceButton.click();
            } else {
                await dataSource.addNewDataSourceButton.click();
            }
            await dataSource.dataSource('SystemLink Assets').click();
            await dataSource.page.waitForSelector('text=HTTP');
            dataSourceName = await dataSource.getNameInputFieldValue();

            expect(await dataSource.getNameInputFieldValue()).toContain('ni-slasset-datasource');

            await dataSource.httpSettingsURL.fill(FAKE_API_URL);
            await dataSource.saveAndTestButton.click();

            await expect(dataSource.dataSourceSuccessMessage).toHaveText('Data source connected and authentication successful!', { timeout: 10000 });

        });

        test('delete a SystemLink Assets data source', async () => {
            await dataSource.deleteDataSource(dataSourceName);
            await expect(dataSource.dataSourceSuccessMessage).toHaveText('Data source deleted', { timeout: 10000 });
        });
    });

    test('should show error message when trying to connect with wrong URL', async () => {
        let dataSourceName = '';
        await dataSource.navigateToDatasourcesPage();
        const hasAdd = await dataSource.addDataSourceButton;
        if (!hasAdd) {
            await dataSource.addNewDataSourceButton.click();
        } else {
            await dataSource.addDataSourceButton.click();
        }
        await dataSource.dataSource('SystemLink Assets').click();
        await dataSource.page.waitForSelector('text=HTTP');
        dataSourceName = await dataSource.getNameInputFieldValue();
        await dataSource.httpSettingsURL.fill('http://wrong-url.com');
        await dataSource.saveAndTestButton.click();
        await expect(dataSource.dataSourceErrorMessage).toContainText("failed with status code: 502", { timeout: 10000 });
        await dataSource.deleteDataSource(dataSourceName);
    });
});