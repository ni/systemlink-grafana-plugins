import { DataQueryRequest, DataFrameDTO, FieldType, SelectableValue } from "@grafana/data";
import { NotebookQuery, PagedWebapps } from "./types";
import { NotebookDataSource } from "./NotebookDataSource";

export class NotebookDataSourceEnterprise extends NotebookDataSource {
  defaultQuery = {
    parameters: {},
    output: '',
    cacheTimeout: 86400,
  };

  async runQuery(query: NotebookQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      fields: [
        { name: 'Time', values: [range.from.valueOf(), range.to.valueOf()], type: FieldType.time },
        { name: 'Value', values: [5, 6], type: FieldType.number },
      ],
    };
  }

  override async getNotebookOptions(search: string): Promise<SelectableValue<string>[]> {
    const filter = `name.Contains("${search}") && type == "Notebook"`;
    const response = await this.post<PagedWebapps>(this.instanceSettings.url + '/niapp/v1/webapps/query', { filter, take: 5 });
    return response.webapps.map((webapp) => ({ label: webapp.name, value: webapp.id }));
  }

  shouldRunQuery(query: NotebookQuery): boolean {
    return true;
  }
}
