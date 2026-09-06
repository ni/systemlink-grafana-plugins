export interface Asset {
  id: string;
  name: string;
  serialNumber: string;
}

export interface QueryAssetNameResponse {
  assets: Asset[];
  totalCount: number;
}
