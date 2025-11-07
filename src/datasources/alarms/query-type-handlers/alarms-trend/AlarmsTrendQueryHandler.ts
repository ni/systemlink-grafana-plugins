import { DataFrameDTO, DataQueryRequest, FieldType } from '@grafana/data';
import { AlarmsQueryHandlerCore } from 'datasources/alarms/query-type-handlers/AlarmsQueryHandlerCore';
import { defaultAlarmsTrendQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { AlarmsTrendQuery, AlarmTransitionEvent, AlarmTransitionWithNumericTime } from 'datasources/alarms/types/AlarmsTrend.types';
import { Alarm, AlarmTransitionType, TransitionInclusionOption } from 'datasources/alarms/types/types';

export class AlarmsTrendQueryHandler extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultAlarmsTrendQuery;

  public async runQuery(query: AlarmsTrendQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const { start, end, intervalMs } = this.extractTimeParameters(options);
    const filter = this.getTrendQueryFilter(query, start, end);
    const alarms = await this.queryAlarmsUntilComplete({ filter, transitionInclusionOption: TransitionInclusionOption.All });
    const alarmsWithTimestamp = this.enrichTransitionsWithTimestamp(alarms);
    const trendData = this.countActiveAlarmsPerInterval(alarmsWithTimestamp, start, end, intervalMs);

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

  private extractTimeParameters(options: DataQueryRequest) {
    const start = new Date(this.templateSrv.replace('${__from:date}', options.scopedVars));
    const end = new Date(this.templateSrv.replace('${__to:date}', options.scopedVars));
    const intervalMs = options.intervalMs;
    return { start, end, intervalMs };
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
      transitions: (alarm.transitions?.map(transition => ({
        ...transition,
        occurredAtAsNumber: new Date(transition.occurredAt).getTime(),
      })) ?? []).sort((a, b) => a.occurredAtAsNumber - b.occurredAtAsNumber) as AlarmTransitionWithNumericTime[]
    }));
  }

  private countActiveAlarmsPerInterval(alarms: Alarm[], start: Date, end: Date, intervalMs: number): Map<number, number> {
    const intervalCounts = new Map<number, number>();
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const alarmTransitionEvents: AlarmTransitionEvent[] = [];

    alarms.forEach(alarm => {
      for (const transition of alarm.transitions) {
        const occurredAtAsNumber = (transition as AlarmTransitionWithNumericTime).occurredAtAsNumber;
        
        if (occurredAtAsNumber > endTime) {
          break;
        }
        
        alarmTransitionEvents.push({
          occurredAtAsNumber,
          alarmId: alarm.alarmId,
          type: transition.transitionType
        });
      }
    });

    alarmTransitionEvents.sort((a, b) => a.occurredAtAsNumber - b.occurredAtAsNumber);

    const alarmStates = new Map<string, AlarmTransitionType>();
    let eventIndex = 0;

    for (let intervalStart = startTime; intervalStart <= endTime; intervalStart += intervalMs) {
      while (eventIndex < alarmTransitionEvents.length && alarmTransitionEvents[eventIndex].occurredAtAsNumber <= intervalStart) {
        const event = alarmTransitionEvents[eventIndex];
        alarmStates.set(event.alarmId, event.type);
        eventIndex++;
      }
      
      let activeCount = 0;
      alarmStates.forEach(type => {
        if (type === AlarmTransitionType.Set) {
          activeCount++;
        }
      });
      
      intervalCounts.set(intervalStart, activeCount);
    }
    
    return intervalCounts;
  }
}
