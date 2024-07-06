import { DataQueryRequest, DataFrameDTO, FieldType, SelectableValue } from "@grafana/data";
import { NotebookQuery } from "./types";
import { NotebookDataSource } from "./NotebookDataSource";

export class NotebookDataSourceServer extends NotebookDataSource {

  defaultQuery = {
    parameters: {},
    output: '',
    cacheTimeout: 86400,
  };

  override async getNotebookOptions(search: string): Promise<SelectableValue<string>[]> {
    const filter = `path.Contains("${search}") && metadata["version"] == 2 && !metadata["namespaces"].Contains("ni-testmanagement-parametric-data-statistics")`;
    const response = await this.post<any>(this.instanceSettings.url + '/ninbexec/v2/query-notebooks', { filter, take: 5 });
    return response.notebooks.filter.map(this.notebookToOption);
  }

  private notebookToOption(notebook: any): SelectableValue<string> {
    return {
      label: notebook.path.startsWith('_shared') ? notebook.path.substring(1) : notebook.path.substring(notebook.path.indexOf('/')),
      value: notebook.path
    }
  }

  async runQuery(query: NotebookQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      fields: [
        { name: 'Time', values: [range.from.valueOf(), range.to.valueOf()], type: FieldType.time },
        { name: 'Value', values: [1, 2], type: FieldType.number },
      ],
    };
  }

  shouldRunQuery(query: NotebookQuery): boolean {
    return true;
  }
}
