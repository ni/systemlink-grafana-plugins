import { Locator, Page } from "playwright/test";
import { AssetQueryEditorComponent } from "./panel-query-editor/asset-query-editor.component";
import { Table } from "./table.component";
import { PanelToolbarComponent } from "./panel-toolbar.component";
import { SystemsQueryEditorComponent } from "./panel-query-editor/system-query-editor.component";
import { NotebookQueryEditorComponent } from "./panel-query-editor/notebook-query-editor.component";
import { TagQueryEditorComponent } from "./panel-query-editor/tag-query-editor.component";
import { WorkItemsQueryEditorComponent } from "./panel-query-editor/work-items-query-editor.component";

export class Panel {
    public readonly assetQueryEditor: AssetQueryEditorComponent;
    public readonly systemsQueryEditor: SystemsQueryEditorComponent;
    public readonly notebookQueryEditor: NotebookQueryEditorComponent;
    public readonly tagQueryEditor: TagQueryEditorComponent;
    public readonly workItemsQueryEditor: WorkItemsQueryEditorComponent;
    public readonly toolbar: PanelToolbarComponent;
    public readonly table: Table;

    constructor(private readonly page: Page) {
        this.assetQueryEditor = new AssetQueryEditorComponent(page);
        this.systemsQueryEditor = new SystemsQueryEditorComponent(page);
        this.notebookQueryEditor = new NotebookQueryEditorComponent(page);
        this.tagQueryEditor = new TagQueryEditorComponent(page);
        this.workItemsQueryEditor = new WorkItemsQueryEditorComponent(page);
        this.toolbar = new PanelToolbarComponent(page);
        this.table = new Table(page);
    }

    public get error(): Locator {
        return this.page.getByRole('button', { name: 'Panel header error' });
    }

    public get noData(): Locator {
        return this.page.getByText('No data', { exact: true });
    }
}
