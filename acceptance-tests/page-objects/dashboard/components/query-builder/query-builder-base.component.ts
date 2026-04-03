import { Page, Locator } from '@playwright/test';
import { pressEnter } from '../../../../utils/keyboard-utilities';

export class QueryBuilderBaseComponent {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public get queryBuilderPropertyField(): Locator {
        return this.page.getByText('Property');
    }

    public get queryBuilderPropertyFieldOpened(): Locator {
        return this.page.getByRole('searchbox', { name: 'Input' });
    }

    public get queryBuilderOperationField(): Locator {
        return this.page.getByText('Operator');
    }

    public get queryBuilderValueField(): Locator {
        return this.page.locator('.smart-value-container').getByText('Value');
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

    async addFiltersPropertyByTyping(property: string): Promise<void> {
        await this.queryBuilderPropertyField.last().click();
        await this.queryBuilderPropertyFieldOpened.clear();
        await this.page.keyboard.type(property);
        await this.page.getByRole('option', { name: property, exact: true }).waitFor({ state: 'visible' });
        await pressEnter(this.page);
    }

    async addFiltersOperation(operation: string): Promise<void> {
        await this.queryBuilderOperationField.last().dispatchEvent('pointerdown', { bubbles: true, isPrimary: true });
        await this.page.getByRole('option', { name: operation }).waitFor({ state: 'visible' });
        await this.page.getByRole('option', { name: operation }).click();
    }

    async addFilterGroup(operator: string): Promise<void> {
        await this.addGroupFilterButton.scrollIntoViewIfNeeded();
        await this.addGroupFilterButton.dispatchEvent('pointerdown', { bubbles: true, isPrimary: true });
        const menuButton = operator.toLowerCase() === 'and' ? this.andFilterGroupButton : this.orFilterGroupButton;
        await menuButton.waitFor({ state: 'visible' });
        await menuButton.scrollIntoViewIfNeeded();
        await menuButton.click();
        await this.queryBuilderPropertyField.last().waitFor({ state: 'visible' });
    }
}
