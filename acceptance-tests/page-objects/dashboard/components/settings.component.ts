import { Page, Locator } from '@playwright/test';
import { DashboardAssetVariableComponent } from './dashboard-variable/dashboard-asset-variable.component';
import { DashboardSystemVariableComponent } from './dashboard-variable/dashboard-system-variable.component';

export class Settings {
    readonly page: Page;
    readonly assetVariable: DashboardAssetVariableComponent;
    readonly systemVariable: DashboardSystemVariableComponent;

    constructor(page: Page) {
        this.page = page;
        this.assetVariable = new DashboardAssetVariableComponent(page);
        this.systemVariable = new DashboardSystemVariableComponent(page);
    }

    public get variableButton(): Locator {
        return this.page.getByTestId('data-testid Tab Variables');
    }

    public createdVariable(variableName: string) {
        return this.page.getByRole('gridcell', { name: `Variable editor Table Definition field ${variableName}` });
    }

    public get closeSettingsButton(): Locator {
        return this.page.getByTestId('data-testid dashboard-settings-close');
    }

    async goToVariablesTab(): Promise<void> {
        await this.variableButton.click();
    }

    async addNewVariable(): Promise<void> {
        await this.page.getByRole('button', { name: 'Add variable' }).click();
    }

    async goBackToDashboardPage(): Promise<void> {
        await this.closeSettingsButton.click();
    }
}
