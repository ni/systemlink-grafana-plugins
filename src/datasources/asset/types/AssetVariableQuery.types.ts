import { AssetQuery } from './types';

export interface AssetVariableQuery extends AssetQuery {
  filter: string;
  take?: number;
}
