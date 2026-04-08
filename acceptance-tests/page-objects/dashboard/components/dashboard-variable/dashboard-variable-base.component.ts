import { Locator, Page } from "playwright/test";

export class DashboardVariableBaseComponent {
    protected readonly page: Page;

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

    public get notebookVariableDropdown() {
        // return this.page.locator('#react-select-6-input');
        return this.page.locator('text=Select notebook').first();
    }

    public async setVariableName(name: string): Promise<void> {
        await this.nameInputField.fill(name);
    }

    public async selectDataSource(dataSourceName: string): Promise<void> {
        await this.dataSourceDropdown.click();
        await this.page.click(`text=${dataSourceName}`);
    }

    public async applyVariableChanges(): Promise<void> {
        await this.applyButton.click();
    }

    async selectNotebookVariableDropdownOption(option: string): Promise<void> {
        await this.notebookVariableDropdown.click({ force: true });
        await this.page.getByText(option).click();
    }
}
