import { DataSourceInstanceSettings, DataQueryRequest, DataFrameDTO } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';

import { DataSourceBase } from 'core/DataSourceBase';
import { AlarmsQuery, AlarmPropertiesOptions } from './types';
import { alarms } from './constants/alarms';

// Define the Alarm type locally if not exported from './types'
export interface Alarm {
  instanceId: string;
  alarmId: string;
  workspace: string;
  active: boolean;
  clear: boolean;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  occurredAt: string;
  updatedAt: string;
  createdBy: string;
  transitions: AlarmTransition[];
  transitionOverflowCount: number;
  notificationStrategyIds: string[];
  currentSeverityLevel: number;
  highestSeverityLevel: number;
  channel: string;
  condition: string;
  displayName: string;
  description: string;
  keywords: string[];
  notes: AlarmNote[];
  properties: {
    [key: string]: string;
  };
  resourceType: string;
}

export interface AlarmTransition {
  transitionType: AlarmTransitionType;
  occurredAt: string;
  severityLevel: number;
  value: string;
  condition: string;
  shortText: string;
  detailText: string;
  keywords: string[];
  endedAt?: string; // Optional, used for the last transition
  properties: {
    [key: string]: string;
  };
}

export interface AlarmNote {
  note: string;
  createdAt: string;
  user: string;
}

export enum AlarmTransitionType {
  Set = 'SET',
  Clear = 'CLEAR',
}

export enum AlarmTransitionInclusionOption {
  None = 'NONE',
  MostRecentOnly = 'MOST_RECENT_ONLY',
  All = 'ALL',
}

export class AlarmsDataSource extends DataSourceBase<AlarmsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = `${this.instanceSettings.url}/nialarm/v1`;
  queryAlarmsUrl = `${this.baseUrl}/query-alarms`;
  errorTitle = '';
  errorDescription = '';
  defaultQuery = {
    properties: [
      AlarmPropertiesOptions.ID,
      AlarmPropertiesOptions.NAME,
      AlarmPropertiesOptions.SEVERITY,
      AlarmPropertiesOptions.SEVERITY_LABEL,
      AlarmPropertiesOptions.STATE,
      AlarmPropertiesOptions.MESSAGE,
      AlarmPropertiesOptions.CREATED_AT,
      AlarmPropertiesOptions.UPDATED_AT,
    ] as AlarmPropertiesOptions[],
    orderBy: AlarmPropertiesOptions.UPDATED_AT,
    descending: true,
    take: 1000,
  };

  async runQuery(query: AlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const now = new Date();

    alarms.forEach(alarmInstance => {
      const instanceTransitions = alarmInstance.transitions || [];
      const numberOfTransitions = instanceTransitions.length;

      for (let i = 1; i < numberOfTransitions; i++) {
        instanceTransitions[i - 1].endedAt = instanceTransitions[i].occurredAt;
      }
      if (numberOfTransitions > 0) {
        instanceTransitions[numberOfTransitions - 1].endedAt = now.toISOString();
      }
    });
    // Extract timeline data from alarm transitions
    const timeline: Array<{ time: number; severity: number; alarmId: string }> = [];
    const occurredAtCount: Map<number, number> = new Map();
    const occurredAtCount2: Map<number, number> = new Map();

    alarms.forEach(alarmInstance => {
      const occurredAtDate = new Date(alarmInstance.occurredAt);
      // Remove milliseconds by setting them to zero
      occurredAtDate.setMilliseconds(0);
      const occurredAtTime = occurredAtDate.getTime();
      occurredAtCount.set(occurredAtTime, (occurredAtCount.get(occurredAtTime) || 0) + 1);
      occurredAtDate.setSeconds(Math.floor(Math.random() * 60)); // Randomize seconds for uniqueness
      const occurredAtTimeWithoutSeconds = occurredAtDate.getTime();
      occurredAtCount2.set(occurredAtTimeWithoutSeconds, (occurredAtCount2.get(occurredAtTimeWithoutSeconds) || 0) + 1);
    });

    const times = Array.from(occurredAtCount.keys());
    const counts = Array.from(occurredAtCount.values());

    return {
      refId: query.refId,
      name: query.refId,
      fields: [
        {
          name: 'time',
          type: 'time',
          values: times,
        },
        {
          name: 'count',
          type: 'number',
          values: counts,
        },
        {
          name: 'occurredAtCount',
          type: 'number',
          values: Array.from(occurredAtCount.values()),
        },
        // {
        //   name: 'time',
        //   type: 'time',
        //   values: timeline.map(t => t.time),
        // },
        // {
        //   name: 'severity',
        //   type: 'number',
        //   values: timeline.map(t => t.severity),
        // },
        // {
        //   name: 'alarmId',
        //   type: 'string',
        //   values: timeline.map(t => t.alarmId),
        // },
      ],
    } as DataFrameDTO;
  }

  shouldRunQuery(query: AlarmsQuery): boolean {
    return true;
  }

  async testDatasource() {
    await this.post(this.queryAlarmsUrl, { take: 1 }, { showErrorAlert: false });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
