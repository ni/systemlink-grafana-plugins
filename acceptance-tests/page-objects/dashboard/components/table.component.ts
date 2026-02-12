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
        return this.page.getByTestId('data-testid table body');
    }

    public get tableRow(): Locator {
        return this.getTable.getByRole('row');
    }

    public cellValue(value: string): Locator {
        return this.getTable.getByRole('cell', { name: value });
    }

    async getTableRowCount(): Promise<number> {
        return await this.tableRow.count();
    }

    public getColumnName(columnName: string): Locator {
        if (columnName === 'id' || columnName === 'name' || columnName === 'self calibration') {
            return this.page.getByRole('columnheader', { name: columnName, exact: true });
        }
        return this.page.getByRole('columnheader', { name: columnName });
    };

    public getColumnHeaderByIndex(index: number): Locator {
        return this.page.getByRole('columnheader').nth(index);
    }

    async getColumnHeaderText(index: number): Promise<string> {
        return await this.getColumnHeaderByIndex(index).textContent() || '';
    }

    async getCellInRowByIndex(rowIndex: number, cellIndex: number): Promise<string> {
        return await this.tableRow.nth(rowIndex).getByRole('cell').nth(cellIndex).textContent() || '';
    }

    async getSelectedColumnIndex(propertyName: string): Promise<number> {
        const columnHeaders = await this.page.getByRole('columnheader').allTextContents();
        return columnHeaders.indexOf(propertyName);
    };

    async checkColumnValue(columnName: string, expectedValue: string): Promise<boolean> {
        const columnIndex = await this.getSelectedColumnIndex(columnName);
        const cellValue = await this.getCellInRowByIndex(0, columnIndex);
        return cellValue === expectedValue;
    }
}
