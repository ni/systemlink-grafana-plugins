import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

const isCI = !!process.env.CI;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
    testDir: './',
    testMatch: [
        'tests/**/*.ts',
    ],
    /* Maximum time one test can run for. */
    timeout: 60 * 1000,
    expect: {
        /**
         * Maximum time expect() should wait for the condition to be met.
         * For example in `await expect(locator).toHaveText();`
         */
        timeout: 15000
    },
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: false,
    retries: 1,
    workers: 2,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['html'],
        ['junit', {
            omitFailures: isCI,
            outputFile: 'playwright-results/test-results.xml'
        }]
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        actionTimeout: 20000,
        navigationTimeout: 60000,
        trace: isCI ? 'retain-on-failure' : 'on',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure'
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
            },
        },
    ],

    /* Folder for test artifacts such as screenshots, videos, traces, etc. */
    outputDir: './playwright-results/'
};

// eslint-disable-next-line import/no-default-export
export default config;
