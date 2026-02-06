import { Page } from "playwright/test";

export class GlobalVariableComponent {
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

    public get queryReturnTypeDropdown() {
        return this.page.locator('div').filter({ hasText: /^Asset Tag Path$/ }).nth(2);
    }

    public get applyButton() {
        return this.page.getByTestId('data-testid Variable editor Apply button');
    }

    async setVariableName(name: string): Promise<void> {
        await this.nameInputField.fill(name);
    }

    async selectDataSource(dataSourceName: string): Promise<void> {
        await this.dataSourceDropdown.click();
        //await this.page.getByRole('button', { name: dataSourceName }).click();
        await this.page.click(`text=${dataSourceName}`);
    }

    async selectQueryReturnType(returnType: string): Promise<void> {
        await this.queryReturnTypeDropdown.click();
        await this.page.getByRole('option', { name: returnType }).click();
    }

    async applyVariableChanges(): Promise<void> {
        await this.applyButton.click();
    }
}
