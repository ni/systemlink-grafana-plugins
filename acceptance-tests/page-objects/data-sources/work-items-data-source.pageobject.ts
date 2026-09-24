import { Page } from '@playwright/test';
import { DataSourcePage } from './data-source.pageobject';

export class WorkItemsDataSource extends DataSourcePage {
    constructor(page: Page) {
        super(page);
    }
}
