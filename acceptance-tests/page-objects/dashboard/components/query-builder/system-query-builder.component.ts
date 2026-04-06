import { Page } from "playwright/test";
import { QueryBuilderBaseComponent } from "./query-builder-base.component";
import { systemsColumn } from "../../../../constants/systems-properties.constant";
import { pressEnter } from "../../../../utils/keyboard-utilities";

export class SystemsQueryBuilderComponent extends QueryBuilderBaseComponent {
    constructor(page: Page) {
        super(page);
    }

    async selectQueryBuilderValueOption(property: string, value: string): Promise<void> {
        if (property.toLowerCase() === systemsColumn.workspace || property.toLowerCase() === systemsColumn.connection_status || property.toLowerCase() === systemsColumn.locked_status) {
            await this.queryBuilderValueField.last().click();
            await this.page.locator('input:focus').waitFor({ state: 'visible' });
            await this.page.keyboard.type(value);
            const option = this.page.locator(`[data-label="${value}"]`);
            await option.waitFor({ state: 'visible' });
            await option.click({ force: true });
        } else {
            await this.queryBuilderValueField.last().click();
            await this.page.keyboard.type(value);
        }
    }

    async addFiltersValue(property: string, value: string): Promise<void> {
        await this.selectQueryBuilderValueOption(property, value);
        await pressEnter(this.page);
    }

    async addFilterByTypingPropertyName(property: string, operation: string, value: string): Promise<void> {
        await this.addFiltersPropertyByTyping(property);
        await this.addFiltersOperation(operation);
        await this.addFiltersValue(property, value);
    }
}
