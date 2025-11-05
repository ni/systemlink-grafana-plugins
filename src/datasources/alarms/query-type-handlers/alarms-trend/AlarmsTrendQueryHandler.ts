import { DataFrameDTO, DataQueryRequest, FieldType } from '@grafana/data';
import { AlarmsQueryHandlerCore } from 'datasources/alarms/query-type-handlers/AlarmsQueryHandlerCore';
import { defaultAlarmsTrendQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { AlarmsTrendQuery } from 'datasources/alarms/types/AlarmsTrend.types';
import { Alarm, AlarmTransition, AlarmTransitionType, TransitionInclusionOption } from 'datasources/alarms/types/types';

export class AlarmsTrendQueryHandler extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultAlarmsTrendQuery;

  public async runQuery(query: AlarmsTrendQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const start = new Date(this.templateSrv.replace('${__from:date}', options.scopedVars));
    const end = new Date(this.templateSrv.replace('${__to:date}', options.scopedVars));
    const intervalInMs = options.intervalMs;
    const filter = this.getTrendQueryFilter(query, start, end);
    const alarms = await this.queryAlarmsUntilComplete({ filter, transitionInclusionOption: TransitionInclusionOption.All });
    const alarmsWithTimestamp = this.enrichTransitionsWithTimestamp(alarms);
    const trendData = this.countActiveAlarmsPerInterval(alarmsWithTimestamp, start, end, intervalInMs);

    return {
      refId: query.refId,
      name: 'Alarms Trend',
      fields: [
        {
          name: 'Time',
          type: FieldType.time,
          values: Array.from(trendData.keys())
        },
        {
          name: 'Alarms Count',
          type: FieldType.number,
          values: Array.from(trendData.values())
        }
      ]
    };
  }

  private getTrendQueryFilter(query: AlarmsTrendQuery, start: Date, end: Date): string {
    const defaultTrendQueryFilter = 
      `(` +
        `(active = "true" && mostRecentSetOccurredAt < "${start.toISOString()}") || ` +
        `(occurredAt > "${start.toISOString()}" && occurredAt < "${end.toISOString()}") ||` +
        `(mostRecentTransitionOccurredAt > "${start.toISOString()}" && mostRecentTransitionOccurredAt < "${end.toISOString()}") || ` +
        `(occurredAt < "${start.toISOString()}" && mostRecentTransitionOccurredAt > "${end.toISOString()}")` +
      `)`;

    if (query.filter && query.filter.trim() !== '') {
      return `${defaultTrendQueryFilter} && (${query.filter})`;
    }

    return defaultTrendQueryFilter;
  }

  private enrichTransitionsWithTimestamp(alarms: Alarm[]): Alarm[] {
    return alarms.map(alarm => ({
      ...alarm,
      transitions: (alarm.transitions?.map((transition: AlarmTransition, index: number) => ({
        ...transition,
        timestamp: new Date(transition.occurredAt).getTime(),
      })) ?? []).sort((a, b) => a.timestamp - b.timestamp)
    }));
  }

  private countActiveAlarmsPerInterval(alarms: Alarm[], start: Date, end: Date, intervalMs: number): Map<number, number> {
    const intervalCounts = new Map<number, number>();
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const events: Array<{
      timestamp: number;
      alarmId: string;
      newState: boolean;
    }> = [];

    alarms.forEach(alarm => {
      for (const transition of alarm.transitions) {
        const timestamp = transition.timestamp;
        
        if (timestamp > endTime) {
          break;
        }
        
        events.push({
          timestamp,
          alarmId: alarm.alarmId,
          newState: transition.transitionType === AlarmTransitionType.Set
        });
      }
    });

    events.sort((a, b) => a.timestamp - b.timestamp);

    const alarmStates = new Map<string, boolean>();
    let eventIndex = 0;

    for (let intervalStart = startTime; intervalStart < endTime; intervalStart += intervalMs) {
      while (eventIndex < events.length && events[eventIndex].timestamp < intervalStart) {
        const event = events[eventIndex];
        alarmStates.set(event.alarmId, event.newState);
        eventIndex++;
      }
      
      let activeCount = 0;
      alarmStates.forEach(isActive => {
        if (isActive) {
          activeCount++;
        }
      });
      
      intervalCounts.set(intervalStart, activeCount);
    }
    
    return intervalCounts;
  }
}
