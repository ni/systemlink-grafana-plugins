import { Page } from "playwright/test";
import { AssetQueryEditorComponent } from "./panel-query-editor/asset-query-editor.component";
import { Table } from "./table.component";
import { PanelToolbarComponent } from "./panel-toolbar.component";
import { SystemsQueryEditorComponent } from "./panel-query-editor/system-query-editor.component";

export class Panel {
    public readonly assetQueryEditor: AssetQueryEditorComponent;
    public readonly systemsQueryEditor: SystemsQueryEditorComponent;
    public readonly toolbar: PanelToolbarComponent;
    public readonly table: Table;

    constructor(page: Page) {
        this.assetQueryEditor = new AssetQueryEditorComponent(page);
        this.systemsQueryEditor = new SystemsQueryEditorComponent(page);
        this.toolbar = new PanelToolbarComponent(page);
        this.table = new Table(page);
    }
}
