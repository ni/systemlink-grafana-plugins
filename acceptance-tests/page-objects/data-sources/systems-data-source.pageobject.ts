import { DataSourcePage } from "./data-source.pageobject";
import { Locator, Page } from '@playwright/test';

export class SystemDataSource extends DataSourcePage {

    constructor(page: Page) {
        super(page);
    }

    public get systemsFeatureFlagsSwitch(): Locator {
        return this.page.locator('div').filter({ hasText: /^System query builder$/ }).locator('input[role="switch"]');
    }

}