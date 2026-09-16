export enum AssetProjectionProperties {
  ID = 'id',
  NAME = 'name',
  SERIAL_NUMBER = 'serialNumber',
}

export interface Asset {
  id: string;
  name?: string;
  serialNumber?: string;
}

export interface QueryAssetsResponse {
  assets: Asset[];
  totalCount: number;
}
