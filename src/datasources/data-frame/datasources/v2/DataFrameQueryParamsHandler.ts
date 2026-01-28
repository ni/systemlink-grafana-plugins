import { UrlQueryMap } from "@grafana/data";
import { locationService } from "@grafana/runtime";
import { syncXAxisRangeTargets } from "datasources/data-frame/constants/v2/route-query-parameters";

export class  DataFrameQueryParamsHandler {
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
}
