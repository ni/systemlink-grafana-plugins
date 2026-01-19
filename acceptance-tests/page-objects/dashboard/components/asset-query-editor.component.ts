import { Page, Locator } from '@playwright/test';

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

    async selectOutputType(selectedOutput: string): Promise<void> {
        await this.page.getByRole('radio', { name: selectedOutput }).click();
    }

    getOutputTypeOption(optionName: string): Locator {
        return this.page.getByRole('radio', { name: optionName });
    }

    async openQueryTypeDropdown(): Promise<void> {
        await this.queryTypeDropdown.click();
    }

    getQueryTypeOption(optionName: string): Locator {
        return this.selectMenu.getByText(optionName, { exact: true });
    }

    async selectQueryType(optionName: string): Promise<void> {
        await this.openQueryTypeDropdown();
        await this.getQueryTypeOption(optionName).click();
    }
}