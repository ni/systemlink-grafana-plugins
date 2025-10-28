import { AssetQuery, AssetQueryReturnType } from './types';

export interface AssetVariableQuery extends AssetQuery {
  filter: string;
  take?: number;
  queryReturnType?: AssetQueryReturnType;
}
