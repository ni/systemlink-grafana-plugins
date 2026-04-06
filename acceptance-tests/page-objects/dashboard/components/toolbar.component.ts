import { Page, Locator } from '@playwright/test';

export class ToolbarComponent {
    private readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public get addButton(): Locator {
        return this.page.getByTestId('data-testid Add button');
    }

    public get saveButton(): Locator {
        return this.page.getByRole('button', { name: 'Save dashboard' });
    }

    public get settingsButton(): Locator {
        return this.page.getByRole('button', { name: 'Dashboard settings' });
    }

    public get timeRangeSelector(): Locator {
        return this.page.getByText('Last 6 hours');
    }

    public async openAddMenu(): Promise<void> {
        await this.addButton.click();
    }

    public async addVisualization(): Promise<void> {
        await this.openAddMenu();
        await this.page.click('text=Add visualization');
    }

    public async addLibraryPanel(): Promise<void> {
        await this.openAddMenu();
        await this.page.click('button:has-text("Add library panel")');
    }

    public async saveDashboard(): Promise<void> {
        await this.saveButton.click();
    }

    public async openSettings(): Promise<void> {
        await this.settingsButton.click();
    }
}
