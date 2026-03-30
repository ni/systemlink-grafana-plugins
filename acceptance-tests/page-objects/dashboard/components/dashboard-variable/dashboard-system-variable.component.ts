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

    public queryBuilderValueField(property: string): Locator {
        return this.page.getByLabel(`${property}`).getByText('Value');
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
        // The jqx query builder needs some time to process the typed text, otherwise the next click action will not find the option in the dropdown and will fail
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
        // The conditionsMenu popup is clipped by the variable-settings form's scroll container.
        // The QB itself has overflow:visible, so the popup escapes the QB element, but Grafana's
        // form panel clips it. Scrolling the form to the bottom before clicking ensures the popup
        // opens in visible space below the button. After selecting the option, scroll back to top
        // so subsequent interactions can find the newly added condition row.
        await this.page.evaluate(() => {
            const scrollContainer = document.querySelector('[class*="scrollbar-view"]') as HTMLElement
                ?? document.querySelector('.scrollbar-view') as HTMLElement;
            if (scrollContainer) { scrollContainer.scrollTop = scrollContainer.scrollHeight; }
        });
        // Wait for the button to be stable after scrolling before clicking.
        await this.addGroupFilterButton.waitFor({ state: 'visible' });
        const menuButton = operator.toLowerCase() === 'and' ? this.andFilterGroupButton : this.orFilterGroupButton;
        // The first click can miss the dropdown opening if the page hasn't fully settled after
        // the scroll. Retry until the And/Or menu item becomes visible.
        await expect(async () => {
            await this.addGroupFilterButton.click();
            await menuButton.waitFor({ state: 'visible', timeout: 2000 });
        }).toPass({ timeout: 10000 });
        await menuButton.click();
        // Scroll back so the new empty condition row (appended at the bottom of the QB) is visible.
        await this.page.evaluate(() => {
            const scrollContainer = document.querySelector('[class*="scrollbar-view"]') as HTMLElement
                ?? document.querySelector('.scrollbar-view') as HTMLElement;
            if (scrollContainer) { scrollContainer.scrollTop = 0; }
        });
        await this.queryBuilderPropertyField.last().waitFor({ state: 'visible' });
    }
}
