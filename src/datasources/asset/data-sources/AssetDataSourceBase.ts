import { DataFrameDTO, DataQueryRequest, TestDataSourceResponse } from "@grafana/data";
import { AssetDataSourceOptions, AssetQuery } from "../types/types";
import { DataSourceBase } from "../../../core/DataSourceBase";
import { defaultOrderBy, systemProjectionForAssets } from "../../system/constants/constants";
import { SystemProperties } from "../../system/types";
import { parseErrorMessage } from "../../../core/errors";
import { QueryBuilderOption, Workspace } from "../../../core/types";
import { buildExpressionFromTemplate, ExpressionTransformFunction, getConcatOperatorForMultiExpression } from "../../../core/query-builder.utils";
import { QueryBuilderOperations } from "../../../core/query-builder.constants";
import { AllFieldNames, LocationFieldNames } from "../constants/constants";
import { ListLocationsResponse, LocationModel } from "../types/ListLocations.types";
import { Observable } from "rxjs";

export abstract class AssetDataSourceBase extends DataSourceBase<AssetQuery, AssetDataSourceOptions> {
  private systemsLoaded!: () => void;
  private locationsLoaded!: () => void;
  private workspacesLeaded!: () => void;

  public areSystemsLoaded$ = new Promise<void>(resolve => this.systemsLoaded = resolve);
  public areLocationsLoaded$ = new Promise<void>(resolve => this.locationsLoaded = resolve);
  public areWorkspacesLoaded$ = new Promise<void>(resolve => this.workspacesLeaded = resolve);

  public error = '';

  public readonly systemAliasCache = new Map<string, SystemProperties>([]);
  public readonly locationCache = new Map<string, LocationModel>([]);
  public readonly workspacesCache = new Map<string, Workspace>([]);


  abstract runQuery(query: AssetQuery, options: DataQueryRequest): Observable<DataFrameDTO>;

  abstract shouldRunQuery(query: AssetQuery): boolean;

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }

  public async querySystems(filter: string, projection: string[]): Promise<SystemProperties[]> {
    try {
      let response = await this.getSystems({
        filter: filter,
        projection: `new(${projection.join()})`,
        orderBy: defaultOrderBy,
      })

      return response.data;
    } catch (error) {
      throw new Error(`An error occurred while querying systems: ${error}`);
    }
  }

  public async getLocations(): Promise<LocationModel[]> {
    try {
      let response = await this.get<ListLocationsResponse>(this.instanceSettings.url + '/nilocation/v1/locations');

      return response.locations;
    } catch (error) {
      throw new Error(`An error occurred while retrieving locations: ${error}`);
    }
  }

  public getCachedSystems(): SystemProperties[] {
    return Array.from(this.systemAliasCache.values());
  }

  public getCachedLocations(): LocationModel[] {
    return Array.from(this.locationCache.values());
  }

  public getCachedWorkspaces(): Workspace[] {
    return Array.from(this.workspacesCache.values());
  }

  public readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

  public async loadDependencies(): Promise<void> {
    this.error = '';

    await this.loadSystems();
    await this.loadLocations();
    await this.loadWorkspaces();
  }

  private async loadSystems(): Promise<void> {
    if (this.systemAliasCache.size > 0) {
      return;
    }

    const systems = await this.querySystems('', systemProjectionForAssets)
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    systems?.forEach(system => this.systemAliasCache.set(system.id, system));

    this.systemsLoaded();
  }

  private async loadLocations(): Promise<void> {
    if (this.locationCache.size > 0) {
      return;
    }

    const locations = await this.getLocations()
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    locations?.forEach(location => this.locationCache.set(location.id, location));

    this.locationsLoaded();
  }

  private async loadWorkspaces(): Promise<void> {
    if (this.workspacesCache.size > 0) {
      return;
    }

    const workspaces = await this.getWorkspaces()
      .catch(error => {
        this.error = parseErrorMessage(error)!;
      });

    workspaces?.forEach(workspace => this.workspacesCache.set(workspace.id, workspace));

    this.workspacesLeaded();
  }

  public readonly queryTransformationOptions = new Map<string, Map<string, unknown>>([
    [AllFieldNames.LOCATION, new Map<string, unknown>()],
    [AllFieldNames.CALIBRATION_DUE_DATE, new Map<string, unknown>()]
  ]);

  public readonly assetComputedDataFields = new Map<string, ExpressionTransformFunction>([
    ...this.getDefaultComputedDataFields(),
    this.getOverrideLocationComputedField(),
    this.getOverrideCalibrationDueDateComputedField(),
  ]);

  /**
   * @returns Gathers all fields and applies the default transformation algorithm based on the operation type
   */
  private getDefaultComputedDataFields(): Array<[string, ExpressionTransformFunction]> {
    return [...Object.values(AllFieldNames).map(field => [field, this.getDefaultComputedField(field)] as [string, ExpressionTransformFunction])];
  }

  private getDefaultComputedField(field: string): ExpressionTransformFunction {
    return (value: string, operation: string, _options?: Map<string, unknown>) => {
      switch (operation) {
        case QueryBuilderOperations.CONTAINS.name:
        case QueryBuilderOperations.DOES_NOT_CONTAIN.name:
          return this.handleContainsExpression(field, value, operation);
        default:
          return this.multipleValuesQuery(field)(value, operation, _options);
      }
    }
  }

  private handleContainsExpression(field: string, value: string, operation: string): string {
    let values = [value];
    const containsExpressionTemplate = this.getContainsExpressionTemplate(operation);

    if (this.isMultiSelectValue(value)) {
      values = this.getMultipleValuesArray(value);
    }

    if (values.length > 1) {
      const expression =
        values
          .map(val => buildExpressionFromTemplate(containsExpressionTemplate, field, val))
          .join(` ${getConcatOperatorForMultiExpression(operation)} `);

      return `(${expression})`;
    }

    return buildExpressionFromTemplate(containsExpressionTemplate, field, values[0])!;
  }

  /**
   * @returns Overrides the Location field algorithm to handle transformation for blank expressions, multi-select, 
   * and determining whether the value is a system or location
   */
  private getOverrideLocationComputedField(): [string, ExpressionTransformFunction] {
    return [
      AllFieldNames.LOCATION,
      (value: string, operation: string, options?: Map<string, unknown>) => {
        let values = [value];

        const blankExpressionTemplate = this.getBlankExpressionTemplate(operation);
        if (blankExpressionTemplate) {
          const minionIdExpression = buildExpressionFromTemplate(blankExpressionTemplate, LocationFieldNames.MINION_ID);
          const physicalLocationExpression = buildExpressionFromTemplate(blankExpressionTemplate, LocationFieldNames.PHYSICAL_LOCATION);
          return `(${minionIdExpression} ${getConcatOperatorForMultiExpression(operation)} ${physicalLocationExpression})`;
        }

        if (this.isMultiSelectValue(value)) {
          values = this.getMultipleValuesArray(value);
        }

        if (values.length > 1) {
          return `(${values.map(val => `${LocationFieldNames.MINION_ID} ${operation} "${val}"`).join(` ${getConcatOperatorForMultiExpression(operation)} `)})`;
        }

        if (this.systemAliasCache?.has(value)) {
          return `${LocationFieldNames.MINION_ID} ${operation} "${value}"`
        }

        if (this.locationCache?.has(value)) {
          return `${LocationFieldNames.PHYSICAL_LOCATION} ${operation} "${value}"`
        }

        return `Locations.Any(l => l.MinionId ${operation} "${value}" ${getConcatOperatorForMultiExpression(operation)} l.PhysicalLocation ${operation} "${value}")`;
      }
    ]
  }

  /**
   * @returns Overrides the Calibration Due date computed field to handle the Grafana built-in date variables
   */
  private getOverrideCalibrationDueDateComputedField(): [string, ExpressionTransformFunction] {
    return [
      AllFieldNames.CALIBRATION_DUE_DATE,
      (value: string, operation: string, options?: Map<string, unknown>) => {
        if (value === '${__now:date}') {
          return `${AllFieldNames.CALIBRATION_DUE_DATE} ${operation} "${new Date().toISOString()}"`;
        }

        return `${AllFieldNames.CALIBRATION_DUE_DATE} ${operation} "${value}"`;
      }
    ];
  }

  protected multipleValuesQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string, _options?: any) => {
      if (this.isMultiSelectValue(value)) {
        const query = this.getMultipleValuesArray(value)
          .map(val => `${field} ${operation} "${val}"`)
          .join(` ${getConcatOperatorForMultiExpression(operation)} `);
        return `(${query})`;
      }

      return `${field} ${operation} "${value}"`
    }
  }

  private isMultiSelectValue(value: string): boolean {
    return value.startsWith('{') && value.endsWith('}');
  }

  private getMultipleValuesArray(value: string): string[] {
    return value.replace(/({|})/g, '').split(',');
  }

  private getBlankExpressionTemplate(operation: string): string | undefined {
    if (operation === QueryBuilderOperations.IS_BLANK.name) {
      return QueryBuilderOperations.IS_BLANK.expressionTemplate;
    }

    if (operation === QueryBuilderOperations.IS_NOT_BLANK.name) {
      return QueryBuilderOperations.IS_NOT_BLANK.expressionTemplate;
    }

    return undefined;
  }

  private getContainsExpressionTemplate(operation: string): string | undefined {
    if (operation === QueryBuilderOperations.CONTAINS.name) {
      return QueryBuilderOperations.CONTAINS.expressionTemplate;
    }

    if (operation === QueryBuilderOperations.DOES_NOT_CONTAIN.name) {
      return QueryBuilderOperations.DOES_NOT_CONTAIN.expressionTemplate;
    }

    return undefined;
  }
}
