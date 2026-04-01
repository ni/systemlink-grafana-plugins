import { Locator, Page } from "playwright/test";
import { DashboardVariableBaseComponent } from "./dashboard-variable-base.component";
import { pressEnter } from "../../../../utils/keyboard-utilities";
import { systemsColumn } from "../../../../constants/systems-properties.constant";

export class DashboardSystemVariableComponent extends DashboardVariableBaseComponent {
    constructor(page: Page) {
        super(page);
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

    public get addGroupFilterButton(): Locator {
        return this.page.getByRole('button', { name: 'Add group' });
    }

    public get andFilterGroupButton(): Locator {
        return this.page.getByRole('menuitem', { name: 'And', exact: true });
    }

    public get orFilterGroupButton(): Locator {
        return this.page.getByRole('menuitem', { name: 'Or', exact: true });
    }

    public queryBuilderValueField(value: string): Locator {
        return this.page.getByLabel(`${value}`).getByText('Value');
    }

    public queryReturnTypeDropdown(dropdownOptionName: string) {
        return this.page.locator('div').filter({ hasText: new RegExp(`^${dropdownOptionName}$`) }).nth(2);
    }

    async selectQueryReturnType(initialDropdownOptionName: string, returnType: string): Promise<void> {
        await this.queryReturnTypeDropdown(initialDropdownOptionName).click();
        await this.page.getByRole('option', { name: returnType }).click();
    }

    async selectQueryBuilderValueOption(property: string, value: string): Promise<void> {
        if (property.toLowerCase() === systemsColumn.workspace || property.toLowerCase() === systemsColumn.connection_status || property.toLowerCase() === systemsColumn.locked_status) {
            await this.queryBuilderValueField(property).click();
            await this.page.locator('input:focus').waitFor({ state: 'visible' });
            await this.page.keyboard.type(value);
            const option = this.page.locator('[data-label="' + value + '"]');
            await option.waitFor({ state: 'visible' });
            await option.click();
        } else {
            await this.queryBuilderValueField(property).click();
            await this.page.keyboard.type(value);
        }
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
        await this.page.getByRole('option', { name: operation }).waitFor({ state: 'visible' });
        await this.page.getByRole('option', { name: operation }).click();
        await this.selectQueryBuilderValueOption(property, value);
        await pressEnter(this.page);
    }

    async addFilterGroup(operator: string): Promise<void> {
        await this.addGroupFilterButton.dispatchEvent('pointerdown', { bubbles: true, isPrimary: true });
        const menuButton = operator.toLowerCase() === 'and' ? this.andFilterGroupButton : this.orFilterGroupButton;
        await menuButton.waitFor({ state: 'visible' });
        await menuButton.click();
        await this.queryBuilderPropertyField.last().waitFor({ state: 'visible' });
    }
}
