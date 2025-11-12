import { DataFrameDTO, DataQueryRequest, FieldType } from '@grafana/data';
import { AlarmsQueryHandlerCore } from 'datasources/alarms/query-type-handlers/AlarmsQueryHandlerCore';
import { defaultAlarmsTrendQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { AlarmsTrendQuery, AlarmTransitionEvent, AlarmWithNumericTimeInTransitions } from 'datasources/alarms/types/AlarmsTrend.types';
import { Alarm, AlarmTransitionType, TransitionInclusionOption } from 'datasources/alarms/types/types';

export class AlarmsTrendQueryHandler extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultAlarmsTrendQuery;

  public async runQuery(query: AlarmsTrendQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const { start, end, intervalMs } = this.extractTimeParameters(options);
    const filter = this.getTrendQueryFilter(query, start, end);
    const requestBody = { filter, transitionInclusionOption: TransitionInclusionOption.All };
    const alarms = await this.queryAlarmsUntilComplete(requestBody);
    const alarmsWithTimestamp = this.enrichTransitionsWithTimestamp(alarms);
    const trendData = this.countActiveAlarmsPerInterval(alarmsWithTimestamp, start, end, intervalMs);

    return {
      refId: query.refId,
      name: query.refId,
      fields: [
        {
          name: 'Time',
          type: FieldType.time,
          values: Array.from(trendData.keys())
        },
        {
          name: 'Count',
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
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const activeAndTransitionedBeforeStartFilter = `(active = "true" && mostRecentSetOccurredAt < "${startIso}")`;
    const createdBeforeStartAndTransitionedAfterEndFilter = `(occurredAt < "${startIso}" && mostRecentTransitionOccurredAt > "${endIso}")`;
    const occurredBetweenStartAndEndFilter = `(occurredAt >= "${startIso}" && occurredAt <= "${endIso}")`;
    const transitionedBetweenStartAndEndFilter = `(mostRecentTransitionOccurredAt >= "${startIso}" && mostRecentTransitionOccurredAt <= "${endIso}")`;
    const defaultTrendQueryFilter = `(${[
      activeAndTransitionedBeforeStartFilter,
      createdBeforeStartAndTransitionedAfterEndFilter,
      occurredBetweenStartAndEndFilter,
      transitionedBetweenStartAndEndFilter
    ].join(' || ')})`;

    if (query.filter && query.filter.trim() !== '') {
      return `${defaultTrendQueryFilter} && (${query.filter})`;
    }

    return defaultTrendQueryFilter;
  }

  private enrichTransitionsWithTimestamp(alarms: Alarm[]): AlarmWithNumericTimeInTransitions[] {
    return alarms.map(alarm => ({
      ...alarm,
      transitions: (alarm.transitions?.map(transition => ({
        ...transition,
        occurredAtAsNumber: new Date(transition.occurredAt).getTime(),
      })) ?? []).sort((a, b) => a.occurredAtAsNumber - b.occurredAtAsNumber)
    }));
  }

  private countActiveAlarmsPerInterval(
    alarms: AlarmWithNumericTimeInTransitions[],
    start: Date,
    end: Date,
    intervalMs: number
  ): Map<number, number> {
    const intervalCounts = new Map<number, number>();
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const alarmTransitionEvents: AlarmTransitionEvent[] = alarms
      .flatMap(alarm => 
        alarm.transitions
          .map(transition => {
            const occurredAtAsNumber = transition.occurredAtAsNumber;
            return occurredAtAsNumber <= endTime ? {
              occurredAtAsNumber,
              alarmId: alarm.alarmId,
              type: transition.transitionType
            } : null;
          })
          .filter((event): event is AlarmTransitionEvent => event !== null)
      )
      .sort((a, b) => a.occurredAtAsNumber - b.occurredAtAsNumber);

    const alarmStates = new Map<string, AlarmTransitionType>();
    let eventIndex = 0;

    for (let intervalStart = startTime; intervalStart <= endTime; intervalStart += intervalMs) {
      while (
        eventIndex < alarmTransitionEvents.length
        && alarmTransitionEvents[eventIndex].occurredAtAsNumber <= intervalStart
      ) {
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
