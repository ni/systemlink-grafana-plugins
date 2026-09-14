import { DataSourceBase } from 'core/DataSourceBase';
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse, AppEvents, ScopedVars, DataSourceInstanceSettings } from '@grafana/data';
import { Alarm, AlarmsQuery, AlarmTransitionSeverityLevel, QueryAlarmsRequest, QueryAlarmsResponse } from '../types/types';
import { getQueryBuilderLookupsError, getQueryError } from 'core/errors';
import { QUERY_ALARMS_MAXIMUM_TAKE, QUERY_ALARMS_RELATIVE_PATH, QUERY_ALARMS_REQUEST_PER_SECOND } from '../constants/QueryAlarms.constants';
import { ExpressionTransformFunction, getConcatOperatorForMultiExpression, listFieldsQuery, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { AlarmsQueryBuilderFields } from '../constants/AlarmsQueryBuilder.constants';
import { QueryBuilderOption, QueryResponse, Workspace } from 'core/types';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { queryInBatches, queryUntilComplete } from 'core/utils';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { MINION_ID_CUSTOM_PROPERTY, SYSTEM_CUSTOM_PROPERTY } from '../constants/AlarmProperties.constants';
import { ALARMS_TIME_FIELDS } from '../constants/AlarmsQueryEditor.constants';
import { AlarmsProperties } from '../types/ListAlarms.types';

export abstract class AlarmsQueryHandlerCore extends DataSourceBase<AlarmsQuery> {
  public errorTitle?: string;
  public errorDescription?: string;

  private readonly queryAlarmsUrl = `${this.instanceSettings.url}${QUERY_ALARMS_RELATIVE_PATH}`;
  private readonly workspaceUtils: WorkspaceUtils;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.workspaceUtils = new WorkspaceUtils(this.instanceSettings, this.backendSrv);
  }

  public abstract runQuery(query: AlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO>;
  public readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

  protected async queryAlarms(alarmsRequestBody: QueryAlarmsRequest): Promise<QueryAlarmsResponse> {
    try {
      return await this.post<QueryAlarmsResponse>(
        this.queryAlarmsUrl,
        alarmsRequestBody,
        { showErrorAlert: false }
      );
    } catch (error) {
      const { title, message } = getQueryError(error, 'alarms');

      this.appEvents.publish?.({
        type: AppEvents.alertError.name,
        payload: [title, message],
      });

      throw new Error(message);
    }
  }

  public async loadWorkspaces(): Promise<Map<string, Workspace>> {
    try {
      return await this.workspaceUtils.getWorkspaces();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, Workspace>();
    }
  }

  protected handleDependenciesError(error: unknown): void {
    const { title, message } = getQueryBuilderLookupsError(error, 'alarms');
    this.errorTitle = title;
    this.errorDescription = message;
  }

  protected async queryAlarmsInBatches(alarmsRequestBody: QueryAlarmsRequest): Promise<Alarm[]> {
    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<Alarm>> => {
      const body = {
        ...alarmsRequestBody,
        take: currentTake,
        continuationToken: token,
      };
      const response = await this.queryAlarms(body);

      return {
        data: response.alarms,
        continuationToken: response.continuationToken,
        totalCount: response.totalCount,
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: QUERY_ALARMS_MAXIMUM_TAKE,
      requestsPerSecond: QUERY_ALARMS_REQUEST_PER_SECOND,
    };
    const response = await queryInBatches(queryRecord, batchQueryConfig, alarmsRequestBody.take);

    return response.data;
  }

  protected async queryAlarmsUntilComplete(alarmsRequestBody: QueryAlarmsRequest): Promise<Alarm[]> {
    const queryRecord = async (currentTake: number, token?: string): Promise<QueryResponse<Alarm>> => {
      const body = {
        ...alarmsRequestBody,
        take: currentTake,
        continuationToken: token,
      };
      const response = await this.queryAlarms(body);

      return {
        data: response.alarms,
        continuationToken: response.continuationToken,
        totalCount: response.totalCount,
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: QUERY_ALARMS_MAXIMUM_TAKE,
      requestsPerSecond: QUERY_ALARMS_REQUEST_PER_SECOND,
    };
    const response = await queryUntilComplete(queryRecord, batchQueryConfig);

    return response.data;
  }

  protected transformAlarmsQuery(scopedVars: ScopedVars, query?: string): string | undefined {
    if (!query) {
      return undefined;
    }

    const transformedQuery = transformComputedFieldsQuery(
      this.templateSrv.replace(query, scopedVars),
      this.computedDataFields
    );
    return this.transformSeverityLevelFilters(transformedQuery);
  }

  protected isTimeField(field: AlarmsProperties): boolean {
    return ALARMS_TIME_FIELDS.includes(field);
  }

  private readonly computedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(AlarmsQueryBuilderFields).map(field => {
      const dataField = field.dataField as string;
      let callback;

      switch (dataField) {
        case AlarmsQueryBuilderFields.SOURCE.dataField:
          callback = this.getSourceTransformation();
          break;
        case AlarmsQueryBuilderFields.KEYWORD.dataField:
          callback = listFieldsQuery(dataField);
          break;
        default:
          callback = this.isTimeField(dataField as AlarmsProperties)
            ? timeFieldsQuery(dataField)
            : multipleValuesQuery(dataField);
      }

      return [dataField, callback];
    })
  );

  private transformSeverityLevelFilters(query: string): string {
    const criticalSeverityLevel = AlarmTransitionSeverityLevel.Critical;
    const currentSeverityField = AlarmsQueryBuilderFields.CURRENT_SEVERITY.dataField;
    const highestSeverityField = AlarmsQueryBuilderFields.HIGHEST_SEVERITY.dataField;

    const severityFieldRegex = new RegExp(`(${currentSeverityField}|${highestSeverityField})\\s*(!=|=)\\s*("${criticalSeverityLevel}")`, 'g');

    return query.replace(severityFieldRegex, (match, field, operator, value) => {
      if (operator === '=' && value === `"${criticalSeverityLevel}"`) {
        return `${field} >= ${value}`;
      } else if (operator === '!=' && value === `"${criticalSeverityLevel}"`) {
        return `${field} < ${value}`;
      }
      return match;
    });
  }

  private getSourceTransformation(): ExpressionTransformFunction {
    return (value: string, operation: string) => {
      const systemExpression = multipleValuesQuery(`properties.${SYSTEM_CUSTOM_PROPERTY}`)(value, operation);
      const minionExpression = multipleValuesQuery(`properties.${MINION_ID_CUSTOM_PROPERTY}`)(value, operation);
      const logicalOperator = getConcatOperatorForMultiExpression(operation);

      return `(${systemExpression} ${logicalOperator} ${minionExpression})`;
    };
  }

  public shouldRunQuery(query: AlarmsQuery): boolean {
    return !query.hide;
  }

  public testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error('Method not implemented.');
  }
}
