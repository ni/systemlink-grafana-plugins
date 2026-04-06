import { Locator, Page } from "playwright/test";

export class Table {
    private readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public filterRow(index: number): Locator {
        return this.page.locator('.smart-filter-group-condition[role="group"]').nth(index);
    }

    public get getTable(): Locator {
        return this.page.getByTestId('data-testid table body');
    }

    public get tableRow(): Locator {
        return this.getTable.getByRole('row');
    }

    public cellValue(value: string): Locator {
        return this.getTable.getByRole('cell', { name: value });
    }

    public async getTableRowCount(): Promise<number> {
        return await this.tableRow.count();
    }

    public getColumnHeaderByIndex(index: number): Locator {
        return this.page.getByRole('columnheader').nth(index);
    }

    public async getColumnHeaderText(index: number): Promise<string> {
        return await this.getColumnHeaderByIndex(index).textContent() || '';
    }

    public async getCellInRowByIndex(rowIndex: number, cellIndex: number): Promise<string> {
        return await this.tableRow.nth(rowIndex).getByRole('cell').nth(cellIndex).textContent() || '';
    }

    public async getSelectedColumnIndex(propertyName: string): Promise<number> {
        const columnHeaders = await this.page.getByRole('columnheader').locator('button > div').filter({ hasText: /\S/ }).allTextContents();
        return columnHeaders.indexOf(propertyName);
    };

    public async checkColumnValue(columnName: string, expectedValue: string, rowIndex = 0): Promise<boolean> {
        const columnIndex = await this.getSelectedColumnIndex(columnName);

        if (columnIndex === -1) {
            throw new Error(`Column '${columnName}' not found in table`);
        }

        const cellValue = await this.getCellInRowByIndex(rowIndex, columnIndex);
        return cellValue === expectedValue;
    }
}
