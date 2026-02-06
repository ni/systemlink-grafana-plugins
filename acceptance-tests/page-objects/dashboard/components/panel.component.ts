import { Page } from "playwright/test";
import { AssetQueryEditorComponent } from "./asset-query-editor.component";
import { Table } from "./table.component";

export class Panel {
    readonly page: Page;
    readonly assetQueryEditor: AssetQueryEditorComponent;
    readonly table: Table;

    constructor(page: Page) {
        this.page = page;
        this.assetQueryEditor = new AssetQueryEditorComponent(page);
        this.table = new Table(page);
    }
}
