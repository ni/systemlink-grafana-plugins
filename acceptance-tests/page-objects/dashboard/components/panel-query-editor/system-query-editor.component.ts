import { Page, Locator } from '@playwright/test';
import { SystemsQueryBuilderComponent } from '../query-builder/system-query-builder.component';

export class SystemsQueryEditorComponent {
    private readonly page: Page;
    public readonly queryBuilder: SystemsQueryBuilderComponent;

    constructor(page: Page) {
        this.page = page;
        this.queryBuilder = new SystemsQueryBuilderComponent(page);
    }

    public getQueryType(queryType: string): Locator {
        return this.page.getByRole('radio', { name: queryType });
    }

    public async selectQueryType(queryType: string): Promise<void> {
        await this.getQueryType(queryType).click();
    }

    public async addFilterGroup(operator: string): Promise<void> {
        await this.queryBuilder.addFilterGroup(operator);
    }

    public async addFilterByTypingPropertyName(property: string, operation: string, value: string): Promise<void> {
        await this.queryBuilder.addFilterByTypingPropertyName(property, operation, value);
    }
}
