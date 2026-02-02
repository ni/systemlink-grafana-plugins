import { Page, Locator } from '@playwright/test';
import { time } from 'console';
import { timeout } from 'rxjs';

export class AssetQueryEditorComponent {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public get queryTypeDropdown(): Locator {
        return this.page.locator('label:has-text("Query type")').locator('..').locator('select, [role="combobox"]');
    }

    public get selectMenu(): Locator {
        return this.page.getByTestId('data-testid Select menu');
    }

    public get queryBuilderPropertyField(): Locator {
        return this.page.getByText('Property');
    }

    public get queryBuilderOperationField(): Locator {
        return this.page.getByText('Operator');
    }

    public get queryBuilderValueField(): Locator {
        return this.page.getByTestId('query-editor-row').getByText('Value');
    }

    public get switchToTableViewButton(): Locator {
        return this.page.getByRole('button', { name: 'Switch to table' });
    }

    public get refreshButton(): Locator {
        return this.page.getByTestId('data-testid RefreshPicker run button');
    }

    public selectQueryBuilderPropertyOption(optionName: string): Locator {
        return this.page.getByRole('option', { name: optionName }).locator('a');
    }

    public get propertiesField(): Locator {
        return this.page.getByTestId('query-editor-row');
    }

    public propertiesOptions(optionName: string): Locator {
        return this.page.getByRole('option', { name: optionName });
    }

    public variableDropdown(variableName: string): Locator {
        return this.page.getByTestId(`data-testid Dashboard template variables Variable Value DropDown value link text ${variableName}`);
    }

    public variableDropdownOption(optionName: string): Locator {
        return this.page.getByRole('checkbox', { name: optionName });
    }

    public getQueryTypeOption(optionName: string): Locator {
        return this.selectMenu.getByText(optionName, { exact: true });
    }

    async openQueryTypeDropdown(): Promise<void> {
        await this.queryTypeDropdown.click();
    }

    async selectQueryType(optionName: string): Promise<void> {
        await this.openQueryTypeDropdown();
        await this.getQueryTypeOption(optionName).click();
    }

    async addFilter(property: string, operation: string, value: string): Promise<void> {
        await this.queryBuilderPropertyField.click();
        await this.selectQueryBuilderPropertyOption(property).click();
        await this.page.keyboard.press('Enter');
        await this.queryBuilderOperationField.click();
        await this.page.getByText(operation).click();
        await this.queryBuilderValueField.click();
        await this.page.keyboard.type(value);
        await this.page.keyboard.press('Enter');
    }

    async switchToTableView(): Promise<void> {
        await this.switchToTableViewButton.click();
    }

    async openVariableDropdown(variableName: string, variableOption: string): Promise<void> {
        await this.variableDropdown(variableName).click();
        await this.variableDropdownOption(variableOption).click();
    }

    async refreshData(): Promise<void> {
        await this.refreshButton.click();
    }

    async openQueryProperties(): Promise<void> {
        await this.propertiesField.click();
    }

    async selectQueryProperty(optionName: string): Promise<void> {
        await this.propertiesOptions(optionName).click();
        await this.page.keyboard.press('Escape');
    }
}