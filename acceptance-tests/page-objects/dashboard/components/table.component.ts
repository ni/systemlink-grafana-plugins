import { Locator, Page } from "playwright/test";

export class Table {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public get firstFilterRow(): Locator {
        return this.page.getByRole('group').first();
    }

    public get getTable(): Locator {
        return this.page.getByTestId('data-testid panel content');
    }

    public get tableCell(): Locator {
        return this.getTable.getByRole('cell');
    }

    public cellValue(value: string): Locator {
        return this.getTable.getByRole('cell', { name: value });
    }

    async getTableCellCount(): Promise<number> {
        return await this.tableCell.count();
    }

}