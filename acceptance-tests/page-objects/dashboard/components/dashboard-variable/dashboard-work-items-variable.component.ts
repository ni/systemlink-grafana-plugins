import { Page } from "playwright/test";
import { DashboardVariableBaseComponent } from "./dashboard-variable-base.component";
import { WorkItemsQueryBuilderComponent } from "../query-builder/work-items-query-builder.component";

export class DashboardWorkItemsVariableComponent extends DashboardVariableBaseComponent {
    public readonly queryBuilder: WorkItemsQueryBuilderComponent;

    constructor(page: Page) {
        super(page);
        this.queryBuilder = new WorkItemsQueryBuilderComponent(page);
    }

    public queryTypeDropdown(dropdownOptionName: string) {
        return this.page.locator('div').filter({ hasText: new RegExp(`^${dropdownOptionName}$`) }).nth(2);
    }

    public async selectQueryType(initialDropdownOptionName: string, queryType: string): Promise<void> {
        await this.queryTypeDropdown(initialDropdownOptionName).click();
        await this.page.getByRole('option', { name: queryType }).click();
    }

    public async addFilter(property: string, operation: string, value: string): Promise<void> {
        await this.queryBuilder.addFilter(property, operation, value);
    }
}
