import { test, expect } from '@playwright/test';
import { FAKE_API_URL } from '../../../config/environment';
import { timeOutPeriod } from '../../../constants/global.constant';
import { WorkItemsDataSource } from '../../../page-objects/data-sources/work-items-data-source.pageobject';

test.describe.only('Datasource Configuration', () => {
    let dataSource: WorkItemsDataSource;
    const dataSourceName = 'Systemlink Work Items Configuration';

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        dataSource = new WorkItemsDataSource(page);
    });

    test.afterAll(async () => {
        await dataSource.deleteDataSourceIfExists(dataSourceName);
    });

    test.describe.serial('Creation and Deletion of SystemLink Work Items data source', () => {
        test('should create a SystemLink Work Items data source', async () => {
            await dataSource.navigateToDatasourcesPage();
            await dataSource.addDataSourceButton.click();
            await dataSource.dataSource('SystemLink Work Items').click();
            await dataSource.nameSettingsInputField.waitFor({ state: 'visible', timeout: timeOutPeriod });
            await dataSource.httpSettingsURL.waitFor({ state: 'visible', timeout: timeOutPeriod });
            await dataSource.changeNameInputFieldValue(dataSourceName);
            await dataSource.httpSettingsURL.fill(FAKE_API_URL);

            await dataSource.saveAndTestButton.click();

            await expect(dataSource.dataSourceConnectedSuccessMessage).toBeVisible({ timeout: timeOutPeriod });
        });

        test('delete a SystemLink Work Items data source', async () => {
            await dataSource.deleteDataSource(dataSourceName);

            await expect(dataSource.dataSourceSuccessMessage).toHaveText('Data source deleted', { timeout: timeOutPeriod });
        });
    });

    test('should show error message when trying to connect with wrong URL', async () => {
        await dataSource.navigateToDatasourcesPage();
        await dataSource.addDataSourceButton.click();
        await dataSource.dataSource('SystemLink Work Items').click();
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
