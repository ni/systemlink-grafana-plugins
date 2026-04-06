import { Page } from "playwright/test";
import { DashboardVariableBaseComponent } from "./dashboard-variable-base.component";
import { SystemsQueryBuilderComponent } from "../query-builder/system-query-builder.component";

export class DashboardSystemVariableComponent extends DashboardVariableBaseComponent {
    public readonly queryBuilder: SystemsQueryBuilderComponent;

    constructor(page: Page) {
        super(page);
        this.queryBuilder = new SystemsQueryBuilderComponent(page);
    }

    public queryReturnTypeDropdown(dropdownOptionName: string) {
        return this.page.locator('div').filter({ hasText: new RegExp(`^${dropdownOptionName}$`) }).nth(2);
    }

    public async selectQueryReturnType(initialDropdownOptionName: string, returnType: string): Promise<void> {
        await this.queryReturnTypeDropdown(initialDropdownOptionName).click();
        await this.page.getByRole('option', { name: returnType }).click();
    }

    public async addFilterGroup(operator: string): Promise<void> {
        await this.queryBuilder.addFilterGroup(operator);
    }

    public async addFilterByTypingPropertyName(property: string, operation: string, value: string): Promise<void> {
        await this.queryBuilder.addFilterByTypingPropertyName(property, operation, value);
    }
}
