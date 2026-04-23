import { Page, Locator } from '@playwright/test';
import { pressEscape } from '../../../../utils/keyboard-utilities';

export class NotebookQueryEditorComponent {
    private readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public get notebookDropdown(): Locator {
        return this.page.locator('text=Select notebook').first();
    }

    public get parameterInput(): Locator {
        return this.page.getByTestId('query-editor-row').getByRole('textbox');
    }

    public outputDropdown(outputName: string): Locator {
        return this.page.locator(`text=${outputName}`).first();
    }

    public async selectNotebook(notebookName: string): Promise<void> {
        await this.notebookDropdown.click({ force: true });
        await this.page.getByText(notebookName, { exact: true }).click();
    }

    public async fillParameterInput(value: string): Promise<void> {
        await this.parameterInput.fill(value);
        await pressEscape(this.page);
    }

    public async selectOutput(currentOutputName: string, newOutputName: string): Promise<void> {
        await this.outputDropdown(currentOutputName).click({ force: true });
        await this.page.getByText(newOutputName, { exact: true }).click();
    }
}
