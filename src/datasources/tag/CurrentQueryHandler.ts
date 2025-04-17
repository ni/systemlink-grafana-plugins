import { DataFrameDTO, FieldType, TimeRange } from "@grafana/data";
import { QueryHandler, TagWithValue } from "./types";
import { convertTagValue } from "./utils";
import { Workspace } from "core/types";

export class CurrentQueryHandler extends QueryHandler {
    handleQuery(tagsWithValues: TagWithValue[], result: DataFrameDTO, _workspaces: Workspace[], _range: TimeRange, _maxDataPoints: number | undefined, queryProperties: boolean): Promise<DataFrameDTO> {
        return Promise.resolve(this.handleCurrentQuery(queryProperties, tagsWithValues, result));
    }

    private handleCurrentQuery(queryProperties: boolean, tagsWithValues: TagWithValue[], result: DataFrameDTO): DataFrameDTO {
        const allPossibleProps = this.getAllProperties(tagsWithValues);
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
    
        if (queryProperties) {
            allPossibleProps.forEach((prop) => {
                result.fields.push(
                    {
                        name: prop,
                        values: tagsWithValues.map(({ tag }: TagWithValue) => tag.properties && tag.properties[prop] ? tag.properties[prop] : '')
                    }
                );
            });
        }
    
        return result;
    }
    
    private getAllProperties(data: TagWithValue[]) {
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

