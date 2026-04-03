import { Page, Locator } from '@playwright/test';
import { SystemsQueryBuilderComponent } from '../query-builder/system-query-builder.component';

export class SystemsQueryEditorComponent {
    readonly page: Page;
    public readonly queryBuilder: SystemsQueryBuilderComponent;

    constructor(page: Page) {
        this.page = page;
        this.queryBuilder = new SystemsQueryBuilderComponent(page);
    }

    public getQueryType(queryType: string): Locator {
        return this.page.getByRole('radio', { name: queryType });
    }

    async selectQueryType(queryType: string): Promise<void> {
        await this.getQueryType(queryType).click();
    }

    async addFilterGroup(operator: string): Promise<void> {
        await this.queryBuilder.addFilterGroup(operator);
    }

    async addFilterByTypingPropertyName(property: string, operation: string, value: string): Promise<void> {
        await this.queryBuilder.addFilterByTypingPropertyName(property, operation, value);
    }
}
