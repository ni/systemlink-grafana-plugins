import { Page, Locator } from '@playwright/test';

export class PanelToolbarComponent {
    private readonly page: Page;

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

    public variableDropdown(variableName: string): Locator {
        return this.page.getByTestId(`data-testid Dashboard template variables Variable Value DropDown value link text ${variableName}`);
    }

    public variableDropdownOption(optionName: string): Locator {
        return this.page.getByRole('checkbox', { name: optionName });
    }

    public async refreshData(): Promise<void> {
        await this.refreshButton.click();
    }

    public async openDateTimePicker(): Promise<void> {
        await this.dateTimePicker.click();
    }

    public async switchToTableView(): Promise<void> {
        await this.switchToTableViewButton.click();
    }

    public async setTimeRange(from: string, to: string, timeZoneOption: string): Promise<void> {
        await this.changeTimeSettingsButton.click();
        await this.typeToSearchDropdown.click();
        await this.timeZoneOption(timeZoneOption).click();
        await this.timeRangeFromField.fill(from);
        await this.timeRangeToField.fill(to);
        await this.applyTimeRangeButton.click();
    }

    public async openVariableDropdown(variableName: string, variableOption: string): Promise<void> {
        await this.variableDropdown(variableName).click();
        await this.variableDropdownOption(variableOption).click();
    }
}
