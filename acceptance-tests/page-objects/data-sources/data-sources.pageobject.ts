import { Page, Locator } from '@playwright/test';
import { BASE_URL, FAKE_API_URL } from '../../config/environment';

export class DataSourcesPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public get addDataSourceButton(): Locator {
        return this.page.getByRole('link', { name: 'Add data source' });
    }

    public get addNewDataSourceButton(): Locator {
        return this.page.getByRole('link', { name: 'Add new data source' });
    }

    public dataSource(dataSourceName: string): Locator {
        return this.page.getByRole('button', { name: dataSourceName });
    }

    public get httpSettingsURL(): Locator {
        return this.page.getByTestId('data-testid Datasource HTTP settings url');
    }

    public get nameSettingsInputField(): Locator {
        return this.page.getByTestId('data-testid Data source settings page name input field');
    }

    public get saveAndTestButton(): Locator {
        return this.page.getByTestId('data-testid Data source settings page Save and Test button');
    }

    public get deleteButton(): Locator {
        return this.page.getByTestId('Data source settings page Delete button');
    }

    public get deletePopUpButton(): Locator {
        return this.page.getByTestId('data-testid Confirm Modal Danger Button');
    }

    public get dataSourceErrorMessage(): Locator {
        return this.page.getByTestId('data-testid Alert error');
    }

    public get dataSourceSuccessMessage(): Locator {
        return this.page.getByTestId('data-testid Alert success');
    }

    public existentDataSourceLink(dataSourceName: string): Locator {
        return this.page.getByRole('link', { name: dataSourceName, exact: true });
    }

    async accessExistentDataSource(dataSourceName: string): Promise<void> {
        await this.existentDataSourceLink(dataSourceName).click();
    }

    async navigateToDatasourcesPage(): Promise<void> {
        await this.page.goto(`${BASE_URL}/connections/datasources`)
    }

    async addDataSource(dataSourceName: string): Promise<string> {
        let createdName = '';
        await this.navigateToDatasourcesPage();
        const hasAddDataSource = await this.addDataSourceButton.isVisible({ timeout: 1000 }).catch(() => false);
        if (hasAddDataSource) {
            await this.addDataSourceButton.click();
        } else {
            await this.addNewDataSourceButton.click();
        }
        await this.dataSource(dataSourceName).click();
        await this.page.waitForSelector('text=HTTP');
        await this.httpSettingsURL.fill(FAKE_API_URL);
        createdName = await this.getNameInputFieldValue();
        await this.saveAndTestButton.click();
        return createdName;
    }

    async deleteDataSource(dataSourceName: string): Promise<void> {
        await this.navigateToDatasourcesPage();
        await this.accessExistentDataSource(dataSourceName);
        await this.deleteButton.click();
        await this.deletePopUpButton.click();
    }

    async getNameInputFieldValue(): Promise<string> {
        return await this.nameSettingsInputField.inputValue();
    }
}