import { Page, Route } from '@playwright/test';

export async function interceptApiRoute<T>(
    page: Page,
    urlPattern: string,
    callback: (response: T) => void
): Promise<void> {
    await page.route(urlPattern, async (route: Route) => {
        const response = await route.fetch();
        const responseData = await response.json() as T;
        callback(responseData);
        await route.fulfill({ response });
    });
}
