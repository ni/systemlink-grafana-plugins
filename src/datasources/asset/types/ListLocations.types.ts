export interface ListLocationsResponse {
    locations: LocationModel[];
}

export interface LocationModel {
    id: string;
    name: string;
    pathWithNames: string;
    description?: string;
    type?: string;
    parentId?: string;
    workspace: string;
    enabled: boolean;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
    properties: {
        [key: string]: string
    };
    keywords: string[];
}
