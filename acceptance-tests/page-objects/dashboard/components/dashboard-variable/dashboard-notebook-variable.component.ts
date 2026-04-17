import { Page } from "playwright/test";
import { DashboardVariableBaseComponent } from "./dashboard-variable-base.component";

export class DashboardNotebookVariableComponent extends DashboardVariableBaseComponent {
    constructor(page: Page) {
        super(page);
    }

    public get notebookVariableDropdown() {
        return this.page.getByRole('combobox', { name: 'Select notebook' });
    }

    async selectNotebookVariableDropdownOption(option: string): Promise<void> {
        await this.notebookVariableDropdown.click();
        await this.page.getByText(option).click();
    }
}
