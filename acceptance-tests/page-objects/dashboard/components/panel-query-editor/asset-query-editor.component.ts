import { Page, Locator } from '@playwright/test';
import { assetColumn } from '../../../../constants/asset-list-properties.constant';
import { AssetQueryBuilderComponent } from '../query-builder/asset-query-builder.component';

export class AssetQueryEditorComponent {
    private readonly page: Page;
    public readonly queryBuilder: AssetQueryBuilderComponent;

    constructor(page: Page) {
        this.page = page;
        this.queryBuilder = new AssetQueryBuilderComponent(page);
    }

    public get queryTypeDropdown(): Locator {
        return this.page.locator('label:has-text("Query type")').locator('..').locator('select, [role="combobox"]');
    }

    public get selectMenu(): Locator {
        return this.page.getByTestId('data-testid Select menu');
    }

    public get propertiesField(): Locator {
        return this.page.getByTestId('query-editor-row');
    }

    public get emptyGroupByDropdown(): Locator {
        return this.page.getByTestId('query-editor-row').getByText('Choose');
    }

    public selectGroupByOption(option: string): Locator {
        return this.page.getByRole('option', { name: option });
    }

    public propertiesOptions(optionName: string): Locator {
        if (optionName === assetColumn.id) {
            return this.page.getByRole('option', { name: optionName, exact: true });
        }
        return this.page.getByRole('option', { name: optionName });
    }

    public getQueryTypeOption(optionName: string): Locator {
        return this.selectMenu.getByText(optionName, { exact: true });
    }

    public async openQueryTypeDropdown(): Promise<void> {
        await this.queryTypeDropdown.click();
    }

    public async selectQueryType(optionName: string): Promise<void> {
        await this.openQueryTypeDropdown();
        await this.getQueryTypeOption(optionName).click();
    }

    public async openQueryProperties(): Promise<void> {
        await this.propertiesField.click();
    }

    public async selectQueryProperty(optionName: string): Promise<void> {
        await this.propertiesOptions(optionName).click();
    }

    public async addSelectedPropertyToTable(propertiesList: string[]): Promise<void> {
        for (const property of propertiesList) {
            await this.selectQueryProperty(property);
        }
    }

    public async openEmptyGroupByDropdown(): Promise<void> {
        await this.emptyGroupByDropdown.click();
    }

    public async selectGroupBy(option: string): Promise<void> {
        await this.openEmptyGroupByDropdown();
        await this.selectGroupByOption(option).click();
    }

    public async addFilter(property: string, operation: string, value: string): Promise<void> {
        await this.queryBuilder.addFilter(property, operation, value);
    }
}
