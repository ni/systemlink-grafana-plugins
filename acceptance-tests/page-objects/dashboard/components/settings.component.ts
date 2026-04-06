import { Page, Locator } from '@playwright/test';
import { DashboardAssetVariableComponent } from './dashboard-variable/dashboard-asset-variable.component';
import { DashboardSystemVariableComponent } from './dashboard-variable/dashboard-system-variable.component';

export class Settings {
    private readonly page: Page;
    public readonly assetVariable: DashboardAssetVariableComponent;
    public readonly systemVariable: DashboardSystemVariableComponent;

    constructor(page: Page) {
        this.page = page;
        this.assetVariable = new DashboardAssetVariableComponent(page);
        this.systemVariable = new DashboardSystemVariableComponent(page);
    }

    public get variableButton(): Locator {
        return this.page.getByTestId('data-testid Tab Variables');
    }

    public get closeSettingsButton(): Locator {
        return this.page.getByTestId('data-testid dashboard-settings-close');
    }

    public createdVariable(variableName: string) {
        return this.page.getByRole('gridcell', { name: `Variable editor Table Definition field ${variableName}` });
    }

    public async goToVariablesTab(): Promise<void> {
        await this.variableButton.click();
    }

    public async addNewVariable(): Promise<void> {
        await this.page.getByRole('button', { name: 'Add variable' }).click();
    }

    public async goBackToDashboardPage(): Promise<void> {
        await this.closeSettingsButton.click();
    }

    public async editVariable(variableName: string): Promise<void> {
        await this.createdVariable(variableName).click();
    }
}
