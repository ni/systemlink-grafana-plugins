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
        workspaces: Workspace[],
        range: TimeRange,
        maxDataPoints: number | undefined,
        result: DataFrameDTO,
    ): Promise<DataFrameDTO> {
        const tagPathCount = this.countTagPaths(tagsWithValues);
        const workspaceTagMap = this.groupTagsByWorkspace(tagsWithValues);
        const tagPropertiesMap = this.buildTagPropertiesMap(tagsWithValues, tagPathCount, workspaces);

        const tagsDecimatedHistory = await this.fetchTagsHistory(
            workspaceTagMap,
            workspaces,
            range,
            maxDataPoints,
            tagPathCount
        );

        const mergedTagValuesWithType = this.mergeTagsHistoryValues(tagsDecimatedHistory);

        this.addTimeFieldToResult(result, mergedTagValuesWithType.timestamps);
        this.addTagFieldsToResult(result, mergedTagValuesWithType.values, tagPropertiesMap);

        return result;
    }

    private countTagPaths(tagsWithValues: TagWithValue[]): Record<string, number> {
        const tagPathCount: Record<string, number> = {};
        for (const tagWithValue of tagsWithValues) {
            const tagPath = tagWithValue.tag.path;
            tagPathCount[tagPath] = (tagPathCount[tagPath] ?? 0) + 1;
        }
        return tagPathCount;
    }

    private groupTagsByWorkspace(tagsWithValues: TagWithValue[]): Record<string, TagWithValue[]> {
        const workspaceTagMap: Record<string, TagWithValue[]> = {};
        for (const tagWithValue of tagsWithValues) {
            const workspace = tagWithValue.tag.workspace ?? tagWithValue.tag.workspace_id;
            if (!workspaceTagMap[workspace]) {
                workspaceTagMap[workspace] = [];
            }
            workspaceTagMap[workspace].push(tagWithValue);
        }
        return workspaceTagMap;
    }

    private buildTagPropertiesMap(tagsWithValues: TagWithValue[], tagPathCount: Record<string, number>, workspaces: Workspace[]): Record<string, Record<string, string> | null> {
        const tagPropertiesMap: Record<string, Record<string, string> | null> = {};

        for (const tagWithValue of tagsWithValues) {
            const workspace = tagWithValue.tag.workspace ?? tagWithValue.tag.workspace_id;
            const prefixedPath = tagPathCount[tagWithValue.tag.path] > 1
                ? `${getWorkspaceName(workspaces, workspace)}.${tagWithValue.tag.path}`
                : tagWithValue.tag.path;
            tagPropertiesMap[prefixedPath] = tagWithValue.tag.properties;
        }

        return tagPropertiesMap;
    }

    private async fetchTagsHistory(
        workspaceTagMap: Record<string, TagWithValue[]>,
        workspaces: Workspace[],
        range: TimeRange,
        maxDataPoints: number | undefined,
        tagPathCount: Record<string, number>
    ): Promise<Record<string, TypeAndValues>> {
        const tagsDecimatedHistory: Record<string, TypeAndValues> = {};

        for (const workspace in workspaceTagMap) {
            const tagHistoryResponse = await this.getTagHistoryWithChunks(
                workspaceTagMap[workspace],
                workspace,
                range,
                maxDataPoints || 0,
            );

            for (const path in tagHistoryResponse.results) {
                const prefixedPath = tagPathCount[path] > 1
                    ? `${getWorkspaceName(workspaces, workspace)}.${path}`
                    : path;
                tagsDecimatedHistory[prefixedPath] = tagHistoryResponse.results[path];
            }
        }

        return tagsDecimatedHistory;
    }

    private async getTagHistoryWithChunks(paths: TagWithValue[], workspace: string, range: TimeRange, intervals: number): Promise<TagHistoryResponse> {
        const chunkSize = 10;
        const pathChunks: TagWithValue[][] = [];
        for (let i = 0; i < paths.length; i += chunkSize) {
            pathChunks.push(paths.slice(i, i + chunkSize));
        }

        const aggregatedResults: TagHistoryResponse = { results: {} };

        const chunkResults = await Promise.all(
            pathChunks.map((chunk) => this.getTagHistoryValues(chunk.map(({ tag }) => tag.path), workspace, range, intervals))
        );

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
        const timestamps = this.collectAndSortTimestamps(history);
        return this.mapHistoryToAlignedValues(history, timestamps);
    }

    private collectAndSortTimestamps(history: Record<string, TypeAndValues>): string[] {
        const timestampsSet = new Set<string>();
        for (const path in history) {
            history[path].values.forEach(({ timestamp }) => timestampsSet.add(timestamp));
        }
        return Array.from(timestampsSet).sort();
    }

    private mapHistoryToAlignedValues(
        history: Record<string, TypeAndValues>,
        timestamps: string[]
    ): TimeAndTagTypeValues {
        const timeAndTagTypeValues: TimeAndTagTypeValues = {
            timestamps,
            values: {}
        };

        for (const path in history) {
            timeAndTagTypeValues.values[path] = {
                type: history[path].type,
                values: Array(timestamps.length).fill(null)
            };

            history[path].values.forEach(({ timestamp, value }) => {
                const index = timestamps.indexOf(timestamp);
                timeAndTagTypeValues.values[path].values[index] = value;
            });
        }

        return timeAndTagTypeValues;
    }

    private addTimeFieldToResult(result: DataFrameDTO, timestamps: string[]): void {
        result.fields.push({
            name: 'time',
            values: timestamps.map(v => dateTime(v).valueOf()),
            type: FieldType.time,
        });
    }

    private addTagFieldsToResult(
        result: DataFrameDTO,
        values: Record<string, { type: string; values: any[] }>,
        tagPropertiesMap: Record<string, Record<string, string> | null>
    ): void {
        for (const path in values) {
            const config: FieldConfig = {};
            const tagProps = tagPropertiesMap[path];

            if (tagProps?.units) {
                config.unit = tagProps.units;
            }
            if (tagProps?.displayName) {
                config.displayName = tagProps.displayName;
                config.displayNameFromDS = tagProps.displayName;
            }

            result.fields.push({
                name: path,
                values: values[path].values.map(value => convertTagValue(values[path].type, value)),
                config,
            });
        }
    }
}
