export interface ListLocationsResponse {
    locations: LocationModel[];
}

export interface LocationModel {
    id: string;
    name: string;
}
