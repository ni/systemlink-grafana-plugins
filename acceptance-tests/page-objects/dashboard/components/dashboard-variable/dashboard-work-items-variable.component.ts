import { Page } from "playwright/test";
import { DashboardVariableBaseComponent } from "./dashboard-variable-base.component";

export class DashboardWorkItemsVariableComponent extends DashboardVariableBaseComponent {
    constructor(page: Page) {
        super(page);
    }

    public queryTypeDropdown(dropdownOptionName: string) {
        return this.page.locator('div').filter({ hasText: new RegExp(`^${dropdownOptionName}$`) }).nth(2);
    }

    public async selectQueryType(initialDropdownOptionName: string, queryType: string): Promise<void> {
        await this.queryTypeDropdown(initialDropdownOptionName).click();
        await this.page.getByRole('option', { name: queryType }).click();
    }
}
