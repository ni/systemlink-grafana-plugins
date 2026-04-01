import { Page, Locator } from '@playwright/test';

export class PanelToolbarComponent {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public get refreshButton(): Locator {
        return this.page.getByTestId('data-testid RefreshPicker run button');
    }

    public get dateTimePicker(): Locator {
        return this.page.getByTestId('data-testid TimePicker Open Button');
    }

    public get timeRangeFromField(): Locator {
        return this.page.getByTestId('data-testid Time Range from field');
    }

    public get timeRangeToField(): Locator {
        return this.page.getByTestId('data-testid Time Range to field');
    }

    public get applyTimeRangeButton(): Locator {
        return this.page.getByTestId('data-testid TimePicker submit button');
    }

    public get changeTimeSettingsButton(): Locator {
        return this.page.getByTestId('data-testid Time zone picker Change time settings button');
    }

    public get typeToSearchDropdown(): Locator {
        return this.page.getByTestId('data-testid Time zone picker select container').getByRole('combobox', { name: 'Time zone picker' });
    }

    public get switchToTableViewButton(): Locator {
        return this.page.getByText('Table view');
    }

    public timeZoneOption(option: string): Locator {
        return this.page.getByRole('option', { name: option });
    }

    async refreshData(): Promise<void> {
        await this.refreshButton.click();
    }

    async openDateTimePicker(): Promise<void> {
        await this.dateTimePicker.click();
    }

    async switchToTableView(): Promise<void> {
        await this.switchToTableViewButton.click();
    }

    async setTimeRange(from: string, to: string, timeZoneOption: string): Promise<void> {
        await this.changeTimeSettingsButton.click();
        await this.typeToSearchDropdown.click();
        await this.timeZoneOption(timeZoneOption).click();
        await this.timeRangeFromField.fill(from);
        await this.timeRangeToField.fill(to);
        await this.applyTimeRangeButton.click();
    }
}
