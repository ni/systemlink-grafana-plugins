import { Page, Locator } from '@playwright/test';
import { ToolbarComponent } from './components/toolbar.component';
import { AssetQueryEditorComponent } from './components/asset-query-editor.component';

export class DashboardPage {
    readonly page: Page;
    readonly toolbar: ToolbarComponent;
    readonly assetQueryEditor: AssetQueryEditorComponent;

    constructor(page: Page) {
        this.page = page;
        this.toolbar = new ToolbarComponent(page);
        this.assetQueryEditor = new AssetQueryEditorComponent(page);
    }

    public get addVisualizationButton(): Locator {
        return this.page.getByRole('button', { name: 'Add visualization' });
    }

    async selectDataSource(datasourceName: string): Promise<void> {
        await this.page.waitForSelector(`text=${datasourceName}`);
        await this.page.click(`text=${datasourceName}`);
    }

    async waitForQueryEditor(): Promise<void> {
        await this.page.waitForSelector('text=Query type');
    }

    getPanel(title: string): Locator {
        return this.page.locator(`[data-testid="data-testid Panel header ${title}"]`);
    }
}