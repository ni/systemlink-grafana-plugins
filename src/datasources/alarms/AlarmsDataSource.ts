import { DataSourceInstanceSettings, DataQueryRequest, DataFrameDTO } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';

import { DataSourceBase } from 'core/DataSourceBase';
import { ApiService } from 'core/ApiService';
import { AlarmsQuery, AlarmPropertiesOptions } from './types';
import { queryInBatches } from 'core/utils';

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

  private apiService: ApiService;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.apiService = new ApiService(backendSrv, `${instanceSettings.url}/nialarm/v1`);
  }

  baseUrl = `${this.instanceSettings.url}/nialarm/v1`;
  queryAlarmsUrl = `/query-instances-with-filter`;
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

// Helper to floor date to nearest interval (in ms)
floorDateToInterval(date: Date, intervalMs: number): Date {
  return new Date(Math.floor(date.getTime() / intervalMs) * intervalMs);
}

// Count alarms per interval function
countAlarmsPerInterval(
  alarms: AlarmTransition[],
  intervalMs: number
): Map<Date, number> {
  // Convert timestamps to Date
  const alarmDates = alarms.map(a => new Date(a.occurredAt)).sort((a, b) => a.getTime() - b.getTime());

  if (alarmDates.length === 0) {return new Map();}

  const startTime = this.floorDateToInterval(alarmDates[0], intervalMs);
  const endTime = alarmDates[alarmDates.length - 1];

  const counts: { [key: number]: number } = {};

  // Initialize intervals from startTime to endTime
  for (let time = startTime.getTime(); time <= endTime.getTime(); time += intervalMs) {
    counts[time] = 0;
  }

  // Count alarms in respective intervals
  for (const alarmDate of alarmDates) {
    const bucket = this.floorDateToInterval(alarmDate, intervalMs).getTime();
    counts[bucket] = (counts[bucket] || 0) + 1;
  }

  // Convert counts object to array with Date keys
  return new Map(
    Object.entries(counts).map(([time, count]) => [
      new Date(Number(time)),
      count,
    ])
  );
}

  async runQuery(query: AlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const start = new Date(this.templateSrv.replace('${__from:date}', options.scopedVars));
    const end = new Date(this.templateSrv.replace('${__to:date}', options.scopedVars));
    const now = new Date();
    console.log(options);

    const a = await this.queryAlarmsData();

    a.forEach(alarmInstance => {
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
    // const timeline: Array<{ time: number; severity: number; alarmId: string }> = [];
    // const occurredAtCount: Map<number, number> = new Map();

    // alarms.forEach(alarmInstance => {
    //   const occurredAtDate = new Date(alarmInstance.occurredAt);
    //   // Remove milliseconds by setting them to zero
    //   occurredAtDate.setMilliseconds(0);
    //   const occurredAtTime = occurredAtDate.getTime();
    //   occurredAtDate.setSeconds(Math.floor(Math.random() * 60)); // Randomize seconds for uniqueness
    //   occurredAtCount.set(occurredAtTime, (occurredAtCount.get(occurredAtTime) || 0) + 1);
    // });

    let t = a.flatMap(alarm => alarm.transitions)
    const t2 = t.filter(trans => new Date(trans.occurredAt) >= start && new Date(trans.occurredAt) <= end)

    const t3 = t2.concat(t2).concat(t2).concat(t2).concat(t2).concat(t2).concat(t2).concat(t2).concat(t2).concat(t2);

    const occurredAtCount = this.countAlarmsPerInterval(t3, options.intervalMs);
    console.log('occurredAtCount', occurredAtCount);


    const times = Array.from(occurredAtCount.keys());
    const counts = Array.from(occurredAtCount.values());

    t = t.concat(t)

    return {
      refId: query.refId,
      name: query.refId,
      fields: [
        // {
        //   name: 'time',
        //   type: 'time',
        //   values: times,
        // },
        // {
        //   name: 'count',
        //   type: 'number',
        //   values: counts,
        // },
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
        {
          name: 'occurredAt',
          type: 'time',
          values: t.map(trans => new Date(trans.occurredAt).getTime()),
        },
        {
          name: 'severityLevel',
          type: 'number',
          values: t.map(trans => trans.severityLevel),
        },
        {
          name: 'transitionType',
          type: 'string',
          values: t.map(trans => trans.transitionType),
        },
        {
          name: 'value',
          type: 'string',
          values: t.map(trans => trans.value),
        }, {
          name: 'occurredAt',
          type: 'time',
          values: t.map(trans => new Date(trans.occurredAt).getTime()),
        },
        {
          name: 'severityLevel',
          type: 'number',
          values: t.map(trans => trans.severityLevel),
        },
        {
          name: 'transitionType',
          type: 'string',
          values: t.map(trans => trans.transitionType),
        },
        {
          name: 'value',
          type: 'string',
          values: t.map(trans => trans.value),
        }, {
          name: 'occurredAt',
          type: 'time',
          values: t.map(trans => new Date(trans.occurredAt).getTime()),
        },
        {
          name: 'severityLevel',
          type: 'number',
          values: t.map(trans => trans.severityLevel),
        },
        {
          name: 'transitionType',
          type: 'string',
          values: t.map(trans => trans.transitionType),
        },
        {
          name: 'value',
          type: 'string',
          values: t.map(trans => trans.value),
        }, {
          name: 'occurredAt',
          type: 'time',
          values: t.map(trans => new Date(trans.occurredAt).getTime()),
        },
        {
          name: 'severityLevel',
          type: 'number',
          values: t.map(trans => trans.severityLevel),
        },
        {
          name: 'transitionType',
          type: 'string',
          values: t.map(trans => trans.transitionType),
        },
        {
          name: 'value',
          type: 'string',
          values: t.map(trans => trans.value),
        }, {
          name: 'occurredAt',
          type: 'time',
          values: t.map(trans => new Date(trans.occurredAt).getTime()),
        },
        {
          name: 'severityLevel',
          type: 'number',
          values: t.map(trans => trans.severityLevel),
        },
        {
          name: 'transitionType',
          type: 'string',
          values: t.map(trans => trans.transitionType),
        },
        {
          name: 'value',
          type: 'string',
          values: t.map(trans => trans.value),
        }, {
          name: 'occurredAt',
          type: 'time',
          values: t.map(trans => new Date(trans.occurredAt).getTime()),
        },
        {
          name: 'severityLevel',
          type: 'number',
          values: t.map(trans => trans.severityLevel),
        },
        {
          name: 'transitionType',
          type: 'string',
          values: t.map(trans => trans.transitionType),
        },
        {
          name: 'value',
          type: 'string',
          values: t.map(trans => trans.value),
        },
      ],
    } as DataFrameDTO;
  }

  shouldRunQuery(query: AlarmsQuery): boolean {
    return true;
  }

  async testDatasource() {
    await this.apiService.post(this.queryAlarmsUrl, { take: 1 }, { showErrorAlert: false });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

    async queryAlarmsData(
    filter?: string,
    projection?: string[],
    orderBy?: string,
    descending?: boolean,
    take?: number
  ): Promise<Alarm[]> {
    const queryRecord = async (currentTake: number, token?: string): Promise<{ data: Alarm[]; continuationToken?: string }> => {
      const body = {
        transitionInclusionOption: 'ALL',
        continuationToken: token,
      };
      const response = await this.apiService.post<{ alarms: Alarm[]; continuationToken?: string }>(
        this.queryAlarmsUrl,
        body,
        { showErrorAlert: false }
      );
      return {
        data: response.alarms,
        continuationToken: response.continuationToken,
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: 1000, // or your preferred batch size
      requestsPerSecond: 5,   // adjust as needed
    };
    const response = await queryInBatches(queryRecord, batchQueryConfig, 10000);

    return response.data;
  }
}
