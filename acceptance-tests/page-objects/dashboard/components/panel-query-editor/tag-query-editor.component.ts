import { Page, Locator } from '@playwright/test';
import { pressEscape } from '../../../../utils/keyboard-utilities';

export class TagQueryEditorComponent {
    private readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    private get tagPathInput(): Locator {
        return this.page.getByTestId('autosize-input');
    }

    private get propertiesSwitch(): Locator {
        return this.page.locator('label', { hasText: 'Show properties' })
            .locator('..')
            .getByRole('switch');
    }

    private get tagPathSwitch(): Locator {
        return this.page.locator('label', { hasText: 'Show tag path' })
            .locator('..')
            .getByRole('switch');
    }

    private get historyQueryTypeOption(): Locator {
        return this.page.getByRole('radio', { name: 'History' });
    }

    public async selectTagPath(tagPath: string): Promise<void> {
        await this.tagPathInput.fill(tagPath);
        await pressEscape(this.page);
    }

    public async toggleShowProperties(): Promise<void> {
        await this.propertiesSwitch.click({ force: true });
    }

    public async toggleShowTagPath(): Promise<void> {
        await this.tagPathSwitch.click({ force: true });
    }

    public async selectHistoryQueryType(): Promise<void> {
        await this.historyQueryTypeOption.click();
    }
}
