import { Page, Locator } from '@playwright/test';
import { pressEnter } from '../../../../utils/keyboard-utilities';

export class QueryBuilderBaseComponent {
    protected readonly page: Page;

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

    public async addFiltersPropertyByTyping(property: string): Promise<void> {
        await this.queryBuilderPropertyField.last().click();
        await this.queryBuilderPropertyFieldOpened.clear();
        await this.page.keyboard.type(property);
        await this.page.getByRole('option', { name: property, exact: true }).waitFor({ state: 'visible' });
        await pressEnter(this.page);
    }

    public async addFiltersOperation(operation: string): Promise<void> {
        await this.queryBuilderOperationField.last().dispatchEvent('pointerdown', { bubbles: true, isPrimary: true });
        await this.page.getByRole('option', { name: operation }).waitFor({ state: 'visible' });
        await this.page.getByRole('option', { name: operation }).click();
    }

    public async addFilterGroup(operator: string): Promise<void> {
        await this.addGroupFilterButton.evaluate(el => el.scrollIntoView({ block: 'center' }));
        await this.addGroupFilterButton.dispatchEvent('pointerdown', { bubbles: true, isPrimary: true });
        const menuButton = operator.toLowerCase() === 'and' ? this.andFilterGroupButton : this.orFilterGroupButton;
        await menuButton.waitFor({ state: 'visible' });
        // The smart-conditions-menu plays an open animation.
        // Clicking before it finishes dispatches pointer events at mid-animation coordinates
        // and can select "And" instead of "Or" under CPU load.
        await menuButton.evaluate(el =>
            el.closest('.smart-conditions-menu')?.setAttribute('animation', 'none')
        );
        await menuButton.click({ force: true });
        await this.queryBuilderPropertyField.last().waitFor({ state: 'visible' });
    }
}
