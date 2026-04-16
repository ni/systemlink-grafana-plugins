import { Locator, Page, expect } from "playwright/test";
import { GRAFANA_MAJOR_VERSION } from "../../../config/environment";

export class Table {
    private readonly page: Page;
    private readonly isV12 = GRAFANA_MAJOR_VERSION >= 12;

    constructor(page: Page) {
        this.page = page;
    }

    public filterRow(index: number): Locator {
        return this.page.locator('.smart-filter-group-condition[role="group"]').nth(index);
    }

    public get getTableBody(): Locator {
        return this.isV12
            ? this.page.getByTestId('data-testid panel content')
            : this.page.getByTestId('data-testid table body');
    }

    public get tableRow(): Locator {
        return this.isV12
            ? this.page.locator('[role="grid"] [role="row"]').filter({
                has: this.page.locator('[role="gridcell"]'),
            })
            : this.page.getByTestId('data-testid table body').getByRole('row');
    }

    public cellValue(value: string): Locator {
        const cellRole = this.isV12 ? 'gridcell' : 'cell';
        return this.getTableBody.getByRole(cellRole, { name: value });
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
        if (this.isV12) {
            return await this.tableRow.nth(rowIndex)
                .locator('[role="gridcell"]')
                .nth(cellIndex).textContent() || '';
        }
        return await this.tableRow.nth(rowIndex).getByRole('cell').nth(cellIndex).textContent() || '';
    }

    public async getSelectedColumnIndex(propertyName: string): Promise<number> {
        const headerLabelSelector = this.isV12 ? 'span' : 'button > div';

        const getHeaders = async (): Promise<string[]> => {
            return await this.page
                .getByRole('columnheader')
                .locator(headerLabelSelector)
                .filter({ hasText: /\S/ })
                .allTextContents();
        };

        const findInCurrentView = async (): Promise<number> => {
            const headers = await getHeaders();
            const index = headers.indexOf(propertyName);
            return index;
        };

        if (!this.isV12) {
            // v11: no column virtualization — all columns are always in the DOM
            const index = await findInCurrentView();
            return index;
        }

        // v12: columns are virtualized — [role="grid"] is the scrollable container.
        const grid = this.page.locator('[role="grid"]').first();
        const scrollGrid = (scrollValue: number, override?: boolean): Promise<boolean> => {
            return grid.evaluate((el, { value, useOverride }) => {
                const htmlEl = el as HTMLElement;
                const prev = htmlEl.scrollLeft;
                htmlEl.scrollLeft = useOverride ? value : (htmlEl.scrollLeft + value);
                return htmlEl.scrollLeft !== prev;
            }, { value: scrollValue, useOverride: !!override });
        };

        const waitForHeaderChange = async (previousHeaders: string[]): Promise<void> => {
            try {
                await expect.poll(
                    () => getHeaders(),
                    { timeout: 200 }
                ).not.toEqual(previousHeaders);
            } catch { /* headers didn't change */ }
        };

        const headersAtCurrentScroll = await getHeaders();
        const isResetSuccessful = await scrollGrid(0, true);
        if (isResetSuccessful) {
            await waitForHeaderChange(headersAtCurrentScroll);
        }

        let index = await findInCurrentView();
        while (index === -1) {
            const headersBeforeScroll = await getHeaders();
            const scrolled = await scrollGrid(200);
            if (!scrolled) {
                break;
            }
            await waitForHeaderChange(headersBeforeScroll);
            index = await findInCurrentView();
        }

        return index;
    }

    public async checkColumnValue(columnName: string, expectedValue: string, rowIndex = 0): Promise<boolean> {
        const columnIndex = await this.getSelectedColumnIndex(columnName);
        if (columnIndex === -1) {
            throw new Error(`Column '${columnName}' not found in table`);
        }

        const cellValue = await this.getCellInRowByIndex(rowIndex, columnIndex);
        return cellValue === expectedValue;
    }
}
