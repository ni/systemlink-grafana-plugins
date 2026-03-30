import { Page } from '@playwright/test';

export async function pressEscape(page: Page) {
    await page.keyboard.press('Escape');
}

export async function pressEnter(page: Page) {
    await page.keyboard.press('Enter');
}
