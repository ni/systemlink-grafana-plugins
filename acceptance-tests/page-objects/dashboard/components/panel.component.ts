import { Page } from "playwright/test";
import { AssetQueryEditorComponent } from "./panel-query-editor/asset-query-editor.component";
import { Table } from "./table.component";
import { PanelToolbarComponent } from "./panel-toolbar.component";
import { SystemsQueryEditorComponent } from "./panel-query-editor/system-query-editor.component";

export class Panel {
    readonly page: Page;
    readonly assetQueryEditor: AssetQueryEditorComponent;
    readonly systemsQueryEditor: SystemsQueryEditorComponent;
    readonly toolbar: PanelToolbarComponent;
    readonly table: Table;

    constructor(page: Page) {
        this.page = page;
        this.assetQueryEditor = new AssetQueryEditorComponent(page);
        this.systemsQueryEditor = new SystemsQueryEditorComponent(page);
        this.toolbar = new PanelToolbarComponent(page);
        this.table = new Table(page);
    }
}
