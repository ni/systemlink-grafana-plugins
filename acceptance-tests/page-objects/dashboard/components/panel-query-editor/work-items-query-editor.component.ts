import { Page, Locator } from '@playwright/test';

export class WorkItemsQueryEditorComponent {
    private readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    private get queryEditorRow(): Locator {
        return this.page.getByTestId('query-editor-row');
    }

    public outputTypeRadioButton(value: string): Locator {
        return this.page.getByRole('radio', { name: value });
    }

    public get typesMultiCombobox(): Locator {
        return this.queryEditorRow.getByRole('combobox').nth(0);
    }

    public typeOption(name: string): Locator {
        return this.page.getByRole('option', { name });
    }

    public get propertiesMultiCombobox(): Locator {
        return this.queryEditorRow.getByRole('combobox').nth(1);
    }

    public async selectOutputType(value: string): Promise<void> {
        await this.outputTypeRadioButton(value).click();
    }

    public propertyOption(name: string): Locator {
        return this.page.getByRole('option', { name });
    }

    public get takeInput(): Locator {
        return this.queryEditorRow.getByPlaceholder('Enter record count');
    }

    public async setTake(value: number): Promise<void> {
        await this.takeInput.fill(value.toString());
        await this.takeInput.blur();
    }

    // All work item types are selected by default; deselect them all via the "All" option before selecting the given ones.
    public async selectOnlyTypes(types: string[]): Promise<void> {
        await this.typesMultiCombobox.click({ force: true });
        await this.typeOption('All').click();
        for (const type of types) {
            await this.typeOption(type).click();
        }
        await this.page.keyboard.press('Escape');
    }

    public async addSelectedPropertiesToTable(properties: string[]): Promise<void> {
        await this.propertiesMultiCombobox.click({ force: true });
        for (const property of properties) {
            await this.propertiesMultiCombobox.fill(property);
            await this.propertyOption(property).click();
        }
        await this.page.keyboard.press('Escape');
    }
}
