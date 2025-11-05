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
    const filter = this.getTrendQueryFilter(query, start, end);
    const alarms = await this.queryAlarmsUntilComplete({ filter, transitionInclusionOption: TransitionInclusionOption.All });
    const alarmsWithTimestamp = this.enrichTransitionsWithTimestamp(alarms);
    const intervalInMs = options.intervalMs;
    let t1 = new Date().getTime();
    const trendData = this.countActiveAlarmsPerInterval(alarmsWithTimestamp, start, end, intervalInMs);
    let t2 = new Date().getTime();
    console.log(`Time taken: ${t2 - t1} ms`);
    let t3 = new Date().getTime();
    const trendData1 = this.countActiveAlarmsPerInterval1(alarmsWithTimestamp, start, end, intervalInMs);
    let t4 = new Date().getTime();
    console.log(`Time taken: ${t4 - t3} ms`);
    console.log(JSON.stringify(trendData) == JSON.stringify(trendData1));

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
    
    alarms.forEach(alarm => {
      const isActive = this.isAlarmActiveAtTime(alarm, startTime);
      alarmStates.set(alarm.alarmId, isActive);
    });

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

  private isAlarmActiveAtTime(alarm: Alarm, timestamp: number): boolean {
    if (!alarm.transitions || alarm.transitions.length === 0) {
      return false;
    }
    
    let left = 0;
    let right = alarm.transitions.length - 1;
    let lastValidIndex = -1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const transition = alarm.transitions[mid];
      
      if (transition.timestamp <= timestamp) {
        lastValidIndex = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    if (lastValidIndex === -1) {
      return false;
    }
    
    return alarm.transitions[lastValidIndex].transitionType === AlarmTransitionType.Set;
  }

  private isAlarmActiveAtTime1(alarm: Alarm, timestamp: number): boolean {
    if (!alarm.transitions || alarm.transitions.length === 0) {
      return false;
    }
    
    let isActive = false;
    
    // Transitions are already sorted, process them in order
    for (const transition of alarm.transitions) {
      const transitionTime = new Date(transition.occurredAt).getTime();
      
      if (transitionTime > timestamp) {
        break; // Early exit - no more relevant transitions
      }
      
      isActive = transition.transitionType === AlarmTransitionType.Set;
    }
    
    return isActive;
  }
  
  private countActiveAlarmsPerInterval1(alarms: Alarm[], start: Date, end: Date, intervalMs: number): Map<number, number> {
    const intervalCounts = new Map<number, number>();
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    for (let intervalStart = startTime; intervalStart < endTime; intervalStart += intervalMs) {
      let activeCount = 0;

      alarms.forEach(alarm => {
        if (this.isAlarmActiveAtTime1(alarm, intervalStart)) {
          activeCount++;
        }
      });
      
      intervalCounts.set(intervalStart, activeCount);
    }
    
    return intervalCounts;
  }
}
