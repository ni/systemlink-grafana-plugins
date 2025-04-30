import { DataFrameDTO, FieldType, TimeRange } from "@grafana/data";
import { QueryHandler, TagWithValue } from "./types";
import { convertTagValue } from "./utils";
import { Workspace } from "core/types";

export class CurrentQueryHandler extends QueryHandler {
    handleQuery(tagsWithValues: TagWithValue[], result: DataFrameDTO, _workspaces: Workspace[], _range: TimeRange, _maxDataPoints: number | undefined, queryProperties: boolean): Promise<DataFrameDTO> {
        return Promise.resolve(this.handleCurrentQuery(queryProperties, tagsWithValues, result));
    }

    private handleCurrentQuery(queryProperties: boolean, tagsWithValues: TagWithValue[], result: DataFrameDTO): DataFrameDTO {
        this.addDefaultFieldsToResult(result, tagsWithValues);

        if (queryProperties) {
            this.addPropertiesFieldsToResult(result, tagsWithValues);
        }

        return result;
    }

    private addDefaultFieldsToResult(result: DataFrameDTO, tagsWithValues: TagWithValue[]): void {
        result.fields = [
            {
                name: 'name',
                values: tagsWithValues.map(({ tag }: TagWithValue) => tag.properties?.displayName || tag.path)
            },
            {
                name: 'value',
                values: tagsWithValues.map(({ tag, current }: TagWithValue) => convertTagValue(tag.type ?? tag.datatype, current?.value.value)),
            },
            {
                name: 'updated',
                values: tagsWithValues.map(({ current }: TagWithValue) => current?.timestamp),
                type: FieldType.time,
                config: { unit: 'dateTimeFromNow' }
            }
        ];
    }

    private addPropertiesFieldsToResult(result: DataFrameDTO, tagsWithValues: TagWithValue[]): void {
        const allPossibleProps = this.getAllProperties(tagsWithValues);
        allPossibleProps.forEach((prop) => {
            result.fields.push(
                {
                    name: prop,
                    values: tagsWithValues.map(({ tag }: TagWithValue) => tag.properties && tag.properties[prop] ? tag.properties[prop] : '')
                }
            );
        });
    }

    private getAllProperties(data: TagWithValue[]): Set<string> {
        const props: Set<string> = new Set();
        data.forEach((tag) => {
            if (tag.tag.properties) {
                Object.keys(tag.tag.properties)
                    .filter(name => !name.startsWith('nitag'))
                    .forEach((name) => {
                        props.add(name)
                    })
            }
        });

        return props;
    }
}

