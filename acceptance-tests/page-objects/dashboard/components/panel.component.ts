import { Page } from "playwright/test";
import { AssetQueryEditorComponent } from "./asset-query-editor.component";
import { Table } from "./table.component";
import { PanelToolbarComponent } from "./panel-toolbar.component";

export class Panel {
    readonly page: Page;
    readonly assetQueryEditor: AssetQueryEditorComponent;
    readonly toolbar: PanelToolbarComponent;
    readonly table: Table;

    constructor(page: Page) {
        this.page = page;
        this.assetQueryEditor = new AssetQueryEditorComponent(page);
        this.toolbar = new PanelToolbarComponent(page);
        this.table = new Table(page);
    }
}
