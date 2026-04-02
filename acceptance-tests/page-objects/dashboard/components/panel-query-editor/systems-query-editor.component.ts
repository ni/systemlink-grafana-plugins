import { Page, Locator } from '@playwright/test';
import { pressEnter } from '../../../../utils/keyboard-utilities';

export class SystemsQueryEditorComponent {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
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

    public get addGroupFilterButton(): Locator {
        return this.page.getByRole('button', { name: 'Add group' });
    }

    public get andFilterGroupButton(): Locator {
        return this.page.getByRole('menuitem', { name: 'And', exact: true });
    }

    public get orFilterGroupButton(): Locator {
        return this.page.getByRole('menuitem', { name: 'Or', exact: true });
    }

    public get queryBuilderPropertyFieldOpened(): Locator {
        return this.page.getByRole('searchbox', { name: 'Input' });
    }

    public getQueryType(queryType: string): Locator {
        return this.page.getByRole('radio', { name: queryType });
    }

    async addFilterByTypingPropertyName(property: string, operation: string, value: string): Promise<void> {
        await this.queryBuilderPropertyField.last().click();
        await this.queryBuilderPropertyFieldOpened.clear();
        await this.page.keyboard.type(property);
        await this.page.getByRole('option', { name: property }).waitFor({ state: 'visible' });
        await pressEnter(this.page);
        // The library makes the Operator field unclickable via CSS (pointer-events: none).
        // Using dispatchEvent bypasses this restriction and fires the event directly on the element.
        await this.queryBuilderOperationField.last().dispatchEvent('pointerdown', { bubbles: true, isPrimary: true });
        await this.page.getByRole('option', { name: operation }).click();
        await this.queryBuilderValueField.last().click();
        await this.page.keyboard.type(value);
        await pressEnter(this.page);
    }

    async selectQueryType(queryType: string): Promise<void> {
        await this.getQueryType(queryType).click();
    }

    async addFilterGroup(operator: string): Promise<void> {
        await this.addGroupFilterButton.dispatchEvent('pointerdown', { bubbles: true, isPrimary: true });
        const menuButton = operator.toLowerCase() === 'and' ? this.andFilterGroupButton : this.orFilterGroupButton;
        await menuButton.waitFor({ state: 'visible' });
        await menuButton.click();
        await this.queryBuilderPropertyField.last().waitFor({ state: 'visible' });
    }
}
