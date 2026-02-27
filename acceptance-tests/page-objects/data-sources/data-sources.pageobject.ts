import { Page, Locator } from '@playwright/test';
import { GRAFANA_URL, FAKE_API_URL } from '../../config/environment';
import { timeOutPeriod } from '../../constants/asset-list-properties.constant';

export class DataSourcesPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public get addDataSourceButton(): Locator {
        return this.page.getByRole('link', { name: 'Add data source' }).or(this.page.getByRole('link', { name: 'Add new data source' }));
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

    public get dataSourceConnectedSuccessMessage(): Locator {
        return this.page.getByTestId('data-testid Alert success').getByText('Data source connected and authentication successful!Next, you can start to');
    }

    public existentDataSourceLink(dataSourceName: string): Locator {
        return this.page.getByRole('link', { name: dataSourceName, exact: true });
    }

    async accessExistentDataSource(dataSourceName: string): Promise<void> {
        await this.existentDataSourceLink(dataSourceName).click();
    }

    async navigateToDatasourcesPage(): Promise<void> {
        await this.page.goto(`${GRAFANA_URL}/connections/datasources`)
    }

    async addDataSource(dataSource: string, dataSourceNameField: string): Promise<void> {
        await this.navigateToDatasourcesPage();
        await this.addDataSourceButton.click();
        await this.dataSource(dataSource).click();
        await this.nameSettingsInputField.waitFor({ state: 'visible', timeout: timeOutPeriod });
        await this.httpSettingsURL.waitFor({ state: 'visible', timeout: timeOutPeriod });
        await this.changeNameInputFieldValue(dataSourceNameField);
        await this.httpSettingsURL.fill(FAKE_API_URL);
        await this.saveAndTestButton.click();
    }

    async deleteDataSource(dataSourceName: string): Promise<void> {
        await this.navigateToDatasourcesPage();
        await this.accessExistentDataSource(dataSourceName);
        await this.deleteButton.click();
        await this.deletePopUpButton.click();
    }

    async nameInputFieldValue(): Promise<string> {
        return await this.nameSettingsInputField.inputValue();
    }

    async changeNameInputFieldValue(newValue: string): Promise<void> {
        await this.nameSettingsInputField.fill(newValue);
    }
}
