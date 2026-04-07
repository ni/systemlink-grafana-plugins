import { Page, Locator } from '@playwright/test';
import { ToolbarComponent } from './components/toolbar.component';
import { Settings } from './components/settings.component';
import { Panel } from './components/panel.component';

export class DashboardPage {
    public readonly page: Page;
    public readonly toolbar: ToolbarComponent;
    public readonly panel: Panel;
    public readonly settings: Settings;

    constructor(page: Page) {
        this.page = page;
        this.toolbar = new ToolbarComponent(page);
        this.panel = new Panel(page);
        this.settings = new Settings(page);
    }

    public get dataSourcePicker() {
        return this.page.getByTestId('data-testid Select a data source');
    }

    public get addVisualizationButton(): Locator {
        return this.page.getByRole('button', { name: 'Add visualization' });
    }

    public variableDropdown(variableName: string): Locator {
        return this.page.getByTestId(`data-testid Dashboard template variables Variable Value DropDown value link text ${variableName}`);
    }

    public allVariableDropdownOptions(variableName: string): Locator {
        return this.page.locator(`#options-${variableName} li`);
    }

    public variableDropdownOption(optionName: string): Locator {
        return this.page.getByRole('checkbox', { name: optionName, exact: true });
    }

    public async selectDataSource(datasourceName: string): Promise<void> {
        await this.page.waitForSelector(`text=${datasourceName}`);
        await this.page.getByRole('button', { name: datasourceName }).click();
    }

    public async waitForQueryEditor(): Promise<void> {
        await this.page.waitForSelector('text=Query type');
    }

    public async createFirstVisualization(datasource: string): Promise<void> {
        await this.addVisualizationButton.waitFor();
        await this.addVisualization();
        await this.selectDataSource(datasource);
    }

    public getPanel(title: string): Locator {
        return this.page.locator(`[data-testid="data-testid Panel header ${title}"]`);
    }

    public addVisualization(): Promise<void> {
        return this.addVisualizationButton.click();
    }
}
