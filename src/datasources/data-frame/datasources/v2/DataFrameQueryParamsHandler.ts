import { UrlQueryMap, UrlQueryValue } from "@grafana/data";
import { locationService } from "@grafana/runtime";
import { queryParamPrefix, syncXAxisRangeTargets } from "datasources/data-frame/constants/v2/route-query-parameters";

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
        const minParamKey = `${queryParamPrefix}-${columnName}-min`;
        const maxParamKey = `${queryParamPrefix}-${columnName}-max`;
        const minParamValue = this.getParamValue(queryParams[minParamKey]);
        const maxParamValue = this.getParamValue(queryParams[maxParamKey]);

        if (
            !this.isValidNumericValue(minParamValue) ||
            !this.isValidNumericValue(maxParamValue)
        ) {
            return null;
        }

        const parsedMinParamValue = Number(minParamValue);
        const parsedMaxParamValue = Number(maxParamValue);
        
        if (parsedMinParamValue > parsedMaxParamValue) {
            return null;
        }
        
        return {
            min: parsedMinParamValue,
            max: parsedMaxParamValue
        };
    }

    private static getParamValue(param: UrlQueryValue): string | undefined {
        if (Array.isArray(param)) {
            return param[param.length - 1]?.toString();
        }

        return param?.toString();
    }

    private static isValidNumericValue(value?: string): boolean {
        if (!value || value.trim() === '') {
            return false;
        }

        const parsedNumber = Number(value);

        return Number.isFinite(parsedNumber);
    }
}
