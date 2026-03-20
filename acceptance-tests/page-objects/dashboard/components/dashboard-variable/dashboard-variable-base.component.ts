import { time } from "console";
import { Page } from "playwright/test";
import { timeOutPeriod } from "../../../../constants/global.constant";

export class DashboardVariableBaseComponent {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public get nameInputField() {
        return this.page.getByTestId('data-testid Variable editor Form Name field');
    }

    public get dataSourceDropdown() {
        return this.page.getByTestId('data-testid Select a data source');
    }

    public get applyButton() {
        return this.page.getByTestId('data-testid Variable editor Apply button');
    }

    public get runQueryButton() {
        return this.page.getByTestId('data-testid Variable editor Run Query button');
    }

    public get previewOfValuesText() {
        return this.page.getByRole('heading', { name: 'Preview of values' });
    }

    async setVariableName(name: string): Promise<void> {
        await this.nameInputField.fill(name);
    }

    async selectDataSource(dataSourceName: string): Promise<void> {
        await this.dataSourceDropdown.click();
        await this.page.click(`text=${dataSourceName}`);
    }

    async applyVariableChanges(): Promise<void> {
        await this.applyButton.click();
    }

    async pressRunQueryButton(): Promise<void> {
        await this.runQueryButton.click();
        await this.previewOfValuesText.waitFor({ state: 'visible', timeout: timeOutPeriod });
    }
}
