import { Page, Locator } from '@playwright/test';
import { WorkItemsQueryBuilderComponent } from '../query-builder/work-items-query-builder.component';

export class WorkItemsQueryEditorComponent {
    private readonly page: Page;
    public readonly queryBuilder: WorkItemsQueryBuilderComponent;

    constructor(page: Page) {
        this.page = page;
        this.queryBuilder = new WorkItemsQueryBuilderComponent(page);
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

    public get propertiesMultiCombobox(): Locator {
        return this.queryEditorRow.getByRole('combobox').nth(1);
    }

    public get orderByCombobox(): Locator {
        return this.queryEditorRow.getByRole('combobox', { name: 'OrderBy' });
    }

    public get descendingSwitch(): Locator {
        return this.queryEditorRow.getByRole('switch', { name: 'Descending' });
    }

    public get takeInput(): Locator {
        return this.queryEditorRow.getByRole('spinbutton');
    }

    public typeOption(name: string): Locator {
        return this.page.getByRole('option', { name });
    }

    public propertyOption(name: string): Locator {
        return this.page.getByRole('option', { name });
    }

    public async selectOutputType(value: string): Promise<void> {
        await this.outputTypeRadioButton(value).click();
    }

    public async selectTypes(types: string[]): Promise<void> {
        await this.typesMultiCombobox.click({ force: true });
        for (const type of types) {
            await this.typeOption(type).click();
        }
        await this.page.keyboard.press('Escape');
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

    public async selectOrderBy(option: string): Promise<void> {
        await this.orderByCombobox.click({ force: true });
        await this.page.getByRole('option', { name: option }).click();
    }

    public async toggleDescending(): Promise<void> {
        await this.descendingSwitch.click();
    }

    public async setTake(value: string): Promise<void> {
        await this.takeInput.fill(value);
        await this.takeInput.blur();
    }

    public async addFilter(property: string, operation: string, value: string): Promise<void> {
        await this.queryBuilder.addFilter(property, operation, value);
    }
}
