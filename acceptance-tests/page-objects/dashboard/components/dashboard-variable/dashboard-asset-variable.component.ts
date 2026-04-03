import { Locator, Page } from "playwright/test";
import { DashboardVariableBaseComponent } from "./dashboard-variable-base.component";

export class DashboardAssetVariableComponent extends DashboardVariableBaseComponent {
    constructor(page: Page) {
        super(page);
    }

    public queryReturnTypeDropdown(dropdownOptionName: string): Locator {
        return this.page.locator('div').filter({ hasText: new RegExp(`^${dropdownOptionName}$`) }).nth(2);
    }

    async selectQueryReturnType(initialDropdownOptionName: string, returnType: string): Promise<void> {
        await this.queryReturnTypeDropdown(initialDropdownOptionName).click();
        await this.page.getByRole('option', { name: returnType }).click();
    }
}
