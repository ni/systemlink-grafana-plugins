import { Page } from '@playwright/test';

export async function pressEscape(page: Page) {
    await page.keyboard.press('Escape');
}

export async function pressEnter(page: Page) {
    await page.keyboard.press('Enter');
}

export async function selectAllAndDeleteTextInInputField(page: Page): Promise<void> {
    const inputField = page.locator('input:focus, [role="combobox"]:focus').last();
    await inputField.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
}
