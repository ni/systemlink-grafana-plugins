import { Page } from 'playwright/test';
import { QueryBuilderBaseComponent } from './query-builder-base.component';
import { pressEnter } from '../../../../utils/keyboard-utilities';

export class WorkItemsQueryBuilderComponent extends QueryBuilderBaseComponent {
    constructor(page: Page) {
        super(page);
    }

    public async addFiltersValueByTyping(value: string): Promise<void> {
        await this.queryBuilderValueField.click();
        await this.page.keyboard.type(value);
        await pressEnter(this.page);
    }

    public async addFilter(property: string, operation: string, value: string): Promise<void> {
        await this.addFiltersPropertyByTyping(property);
        await this.addFiltersOperation(operation);
        await this.addFiltersValueByTyping(value);
    }
}
