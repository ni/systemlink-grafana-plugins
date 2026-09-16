import { DataSourceInstanceSettings } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { get } from "core/utils";
import { GetLocationsResponse, Location } from "./types/QueryLocations.types";

export class LocationUtils {
    private static _locationsCache?: Promise<Map<string, Location>>;

    private readonly queryLocationsUrl = `${this.instanceSettings.url}/nilocation/v1/locations`;

    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ) {}

    async getLocations(): Promise<Map<string, Location>> {
        if (!LocationUtils._locationsCache) {
            LocationUtils._locationsCache = this.loadLocations();
        }
        return await LocationUtils._locationsCache;
    }

    private async loadLocations(): Promise<Map<string, Location>> {
        const locations = await this.fetchLocations();
        const locationMap = new Map<string, Location>();
        if (locations) {
            locations.forEach(location => locationMap.set(location.id, location));
        }
        return locationMap;
    }

    private async fetchLocations(): Promise<Location[]> {
        try {
            const response = await get<GetLocationsResponse>(
                this.backendSrv,
                this.queryLocationsUrl,
                { showErrorAlert: false }
            );
            return response.locations;
        } catch (error) {
            throw new Error(`An error occurred while querying locations: ${error}`);
        }
    }
}
