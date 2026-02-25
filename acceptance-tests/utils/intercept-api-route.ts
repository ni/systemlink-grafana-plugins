import { Page, Route } from '@playwright/test';

export async function interceptApiRoute<T>(
    page: Page,
    urlPattern: string
): Promise<T> {
    return new Promise<T>(async (resolve) => {
        await page.route(urlPattern, async (route: Route) => {
            const response = await route.fetch();
            const responseData = await response.json() as T;
            await route.fulfill({ response });
            resolve(responseData);
        });
    });
}
