export interface Location {
  id: string;
  name: string;
  pathWithNames: string;
}

export interface GetLocationsResponse {
  locations: Location[];
}
