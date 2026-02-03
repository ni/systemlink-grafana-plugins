import { BusEventBase } from '@grafana/data';

export class NIRefreshDashboardEvent extends BusEventBase {
  static type = 'ni-refresh-dashboard';
}
