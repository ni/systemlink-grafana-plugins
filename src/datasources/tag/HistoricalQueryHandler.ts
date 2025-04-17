import { DataFrameDTO, dateTime, FieldConfig, FieldType, TimeRange } from "@grafana/data";
import { PostFn, QueryHandler, TagHistoryResponse, TagWithValue, TimeAndTagTypeValues, TypeAndValues } from "./types";
import { convertTagValue } from "./utils";
import { getWorkspaceName } from "core/utils";
import { Workspace } from "core/types";

export class HistoricalQueryHandler extends QueryHandler {
    constructor(
        private readonly post: PostFn,
        private readonly baseUrl?: string
    ) {
        super();
    }

    handleQuery(tagsWithValues: TagWithValue[], result: DataFrameDTO, workspaces: Workspace[], range: TimeRange, maxDataPoints: number | undefined, _queryProperties: boolean): Promise<DataFrameDTO> {
        return this.handleHistoricalQuery(tagsWithValues, workspaces, range, maxDataPoints, result);
    }
    
    private async handleHistoricalQuery(
        tagsWithValues: TagWithValue[],
        workspaces: any,
        range: TimeRange,
        maxDataPoints: number | undefined,
        result: DataFrameDTO,
    ): Promise<DataFrameDTO> {
        const workspaceTagMap: Record<string, TagWithValue[]> = {};
        const tagPropertiesMap: Record<string, Record<string, string> | null> = {};
        const tagPathCount: Record<string, number> = {};

        for (const tagWithValue of tagsWithValues) {
            tagPathCount[tagWithValue.tag.path] = (tagPathCount[tagWithValue.tag.path] || 0) + 1;
        }

        for (const tagWithValue of tagsWithValues) {
            const workspace = tagWithValue.tag.workspace ?? tagWithValue.tag.workspace_id;
            if (!workspaceTagMap[workspace]) {
                workspaceTagMap[workspace] = [];
            }
            workspaceTagMap[workspace].push(tagWithValue);
            const prefixedPath = tagPathCount[tagWithValue.tag.path] > 1
                ? `${getWorkspaceName(workspaces, workspace)}.${tagWithValue.tag.path}`
                : tagWithValue.tag.path;
            tagPropertiesMap[prefixedPath] = tagWithValue.tag.properties;
        }

        let tagsDecimatedHistory: { [key: string]: TypeAndValues } = {};
        for (const workspace in workspaceTagMap) {
            const tagHistoryResponse = await this.getTagHistoryWithChunks(
                workspaceTagMap[workspace],
                workspace,
                range,
                maxDataPoints || 0,
            )
            for (const path in tagHistoryResponse.results) {
                const prefixedPath = tagPathCount[path] > 1
                    ? `${getWorkspaceName(workspaces, workspace)}.${path}`
                    : path;
                tagsDecimatedHistory[prefixedPath] = tagHistoryResponse.results[path];
            }
        }

        const mergedTagValuesWithType = this.mergeTagsHistoryValues(tagsDecimatedHistory);
        result.fields.push({
            name: 'time', values: mergedTagValuesWithType.timestamps.map(v => dateTime(v).valueOf()), type: FieldType.time
        });

        for (const path in mergedTagValuesWithType.values) {
            const config: FieldConfig = {};
            const tagProps = tagPropertiesMap[path]
            if (tagProps?.units) {
                config.unit = tagProps.units
            }
            if (tagProps?.displayName) {
                config.displayName = tagProps.displayName
                config.displayNameFromDS = tagProps.displayName
            }
            result.fields.push({
                name: path,
                values: mergedTagValuesWithType.values[path].values.map((value) => {
                    return convertTagValue(mergedTagValuesWithType.values[path].type, value)
                }),
                config
            });
        }

        return result;
    }

    private async getTagHistoryWithChunks(paths: TagWithValue[], workspace: string, range: TimeRange, intervals: number): Promise<TagHistoryResponse> {
        const chunkSize = 10;
        const pathChunks: TagWithValue[][] = [];
        for (let i = 0; i < paths.length; i += chunkSize) {
            pathChunks.push(paths.slice(i, i + chunkSize));
        }

        const aggregatedResults: TagHistoryResponse = { results: {} };

        // Fetch and aggregate the data from each chunk in parallel
        const chunkResults = await Promise.all(
            pathChunks.map((chunk) => this.getTagHistoryValues(chunk.map(({ tag }) => tag.path), workspace, range, intervals))
        );

        // Merge the results from all chunks
        for (const chunkResult of chunkResults) {
            for (const [path, data] of Object.entries(chunkResult.results)) {
                if (!aggregatedResults.results[path]) {
                    aggregatedResults.results[path] = data;
                } else {
                    aggregatedResults.results[path].values.push(...data.values);
                }
            }
        }

        return aggregatedResults;
    }

    private async getTagHistoryValues(paths: string[], workspace: string, range: TimeRange, intervals: number): Promise<TagHistoryResponse> {
        const tagHistoryUrl = this.baseUrl + '/nitaghistorian/v2/tags';
        return await this.post<TagHistoryResponse>(`${tagHistoryUrl}/query-decimated-history`, {
            paths,
            workspace,
            startTime: range.from.toISOString(),
            endTime: range.to.toISOString(),
            decimation: intervals ? Math.min(intervals, 1000) : 500,
        });
    };

    private mergeTagsHistoryValues(history: Record<string, TypeAndValues>): TimeAndTagTypeValues {
        const timestampsSet: Set<string> = new Set();
        const values: TimeAndTagTypeValues = {
            timestamps: [],
            values: {}
        };
        for (const path in history) {
            for (const { timestamp } of history[path].values) {
                timestampsSet.add(timestamp);
            }
        }
        // Uniq timestamps from history data
        const timestamps = [...timestampsSet];
        // Sort timestamps to ensure a consistent order
        timestamps.sort();
        values.timestamps = timestamps;

        // Initialize arrays for each key
        for (const path in history) {
            values.values[path] = { 'type': history[path].type, 'values': new Array(timestamps.length).fill(null) };
        }
        // Populate the values arrays
        for (const path in history) {
            for (const historicalValue of history[path].values) {
                const index = timestamps.indexOf(historicalValue.timestamp);
                values.values[path]['values'][index] = historicalValue.value;
            }
        }

        return values;
    }
}
