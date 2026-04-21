import { Page } from "playwright/test";
import { DashboardVariableBaseComponent } from "./dashboard-variable-base.component";

export class DashboardNotebookVariableComponent extends DashboardVariableBaseComponent {
    constructor(page: Page) {
        super(page);
    }

    public get notebookVariableDropdown() {
        return this.page.locator('text=Select notebook').first();
    }

    async selectNotebookVariableDropdownOption(option: string): Promise<void> {
        await this.notebookVariableDropdown.click({ force: true });
        await this.page.getByText(option).click();
    }
}
