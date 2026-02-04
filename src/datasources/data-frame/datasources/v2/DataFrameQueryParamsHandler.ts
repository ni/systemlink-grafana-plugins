import { UrlQueryMap } from "@grafana/data";
import { locationService } from "@grafana/runtime";
import { xColumnRangeParamPrefix, syncXAxisRangeTargets } from "datasources/data-frame/constants/v2/route-query-parameters";

export class DataFrameQueryParamsHandler {
    public static updateSyncXAxisRangeTargetsQueryParam(
        filterXRangeOnZoomPan: boolean,
        panelId = ''
    ): void {
        if (panelId === '') {
            return;
        }

        const queryParams = locationService.getSearchObject();
        let targets: string[] = this.getSyncXAxisRangeTargets(queryParams);
        if (
            (filterXRangeOnZoomPan && targets.includes(panelId))
            || (!filterXRangeOnZoomPan && !targets.includes(panelId))
        ){
            return;
        }

        if (filterXRangeOnZoomPan) {
            targets.push(panelId);
        } else {
            targets = targets.filter((target) => target !== panelId);
        }

        locationService.partial({
            [syncXAxisRangeTargets]: targets.join(','),
        }, true);
    }

    public static getSyncXAxisRangeTargets(queryParams: UrlQueryMap): string[] {
        const syncXAxisRangeTargetsQueryParam = queryParams[syncXAxisRangeTargets];
        let targets: string[] = [];

        if (
            syncXAxisRangeTargetsQueryParam !== undefined
            && typeof syncXAxisRangeTargetsQueryParam === 'string'
            && syncXAxisRangeTargetsQueryParam !== ''
        ) {
            targets = syncXAxisRangeTargetsQueryParam
                .split(',')
                .map((target) => target.trim())
                .filter((target) => target !== '');
        }

        return targets;
    }

    public static getXColumnRangeFromUrlParams(
        columnName: string
    ): { min: number; max: number } | null {
        const queryParams = locationService.getSearchObject();
        
        const minParamKey = `${xColumnRangeParamPrefix}-${columnName}-min`;
        const maxParamKey = `${xColumnRangeParamPrefix}-${columnName}-max`;
        
        // Handle potential arrays from duplicate URL params - take the last value
        const minParam = queryParams[minParamKey];
        const maxParam = queryParams[maxParamKey];
        const minValue = Array.isArray(minParam) 
            ? minParam[minParam.length - 1]?.toString() 
            : minParam?.toString();
        const maxValue = Array.isArray(maxParam) 
            ? maxParam[maxParam.length - 1]?.toString() 
            : maxParam?.toString();

        if (minValue !== undefined && maxValue !== undefined) {
            if (!this.isValidNumericValue(minValue) || !this.isValidNumericValue(maxValue)) {
                return null;
            }

            const minNum = Number(minValue);
            const maxNum = Number(maxValue);
            
            if (minNum > maxNum) {
                return null;
            }
            
            return {
                min: minNum,
                max: maxNum
            };
        }

        return null;
    }

    private static isValidNumericValue(value: string): boolean {
        if (!value || value.trim() === '') {
            return false;
        }

        const num = Number(value);
        return Number.isFinite(num);
    }
}
