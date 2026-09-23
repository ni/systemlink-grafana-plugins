import { Page } from "playwright/test";
import { DashboardVariableBaseComponent } from "./dashboard-variable-base.component";

export class DashboardWorkItemsVariableComponent extends DashboardVariableBaseComponent {
    constructor(page: Page) {
        super(page);
    }

    public async selectQueryType(queryType: string): Promise<void> {
        await this.queryTypeCombobox.click();
        await this.queryTypeCombobox.fill(queryType);
        await this.page.getByRole('option', { name: queryType }).click();
    }

    private get queryTypeCombobox() {
        return this.page.getByLabel('Query type');
    }
}
