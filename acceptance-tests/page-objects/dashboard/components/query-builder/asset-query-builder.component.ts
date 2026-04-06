import { Locator, Page } from "playwright/test";
import { QueryBuilderBaseComponent } from "./query-builder-base.component";
import { pressEnter } from "../../../../utils/keyboard-utilities";

export class AssetQueryBuilderComponent extends QueryBuilderBaseComponent {
    constructor(page: Page) {
        super(page);
    }

    public selectQueryBuilderPropertyOption(optionName: string): Locator {
        return this.page.getByRole('option', { name: optionName }).locator('a');
    }

    public async addFiltersPropertyBySelectingOption(property: string): Promise<void> {
        await this.queryBuilderPropertyField.last().click();
        await this.selectQueryBuilderPropertyOption(property).click();
        await this.page.getByRole('option', { name: property }).waitFor({ state: 'hidden' });
    }

    public async addFiltersValueByTyping(value: string): Promise<void> {
        await this.queryBuilderValueField.click();
        await this.page.keyboard.type(value);
        await pressEnter(this.page);
    }

    public async addFilter(property: string, operation: string, value: string): Promise<void> {
        await this.addFiltersPropertyBySelectingOption(property);
        await this.addFiltersOperation(operation);
        await this.addFiltersValueByTyping(value);
    }
}
