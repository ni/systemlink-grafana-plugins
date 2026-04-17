import { DataSourcePage } from "./data-source.pageobject";
import { Locator, Page } from '@playwright/test';

export class NotebookDataSource extends DataSourcePage {

    constructor(page: Page) {
        super(page);
    }

    public get notebookDataSourceConnectedSuccessMessage(): Locator {
        return this.page.getByTestId('data-testid Alert success').getByText('Success');
    }
}
