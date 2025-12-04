import { DataFrameDTO, DataQueryRequest, FieldType, ScopedVars } from '@grafana/data';
import { AlarmsQueryHandlerCore } from 'datasources/alarms/query-type-handlers/AlarmsQueryHandlerCore';
import { defaultAlarmsTrendQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { Alarm, AlarmTransitionSeverityLevel, AlarmTransitionType, TransitionInclusionOption } from 'datasources/alarms/types/types';
import { AlarmsTrendQuery, AlarmTransitionEvent, AlarmTrendSeverityLevelLabel, AlarmWithNumericTimeInTransitions } from 'datasources/alarms/types/AlarmsTrend.types';

export class AlarmsTrendQueryHandler extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultAlarmsTrendQuery;
  private readonly countKey = 'Count';

  public async runQuery(query: AlarmsTrendQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const { start, end, intervalMs } = this.extractTimeParameters(options);
    const startTime = start.getTime();
    const endTime = end.getTime();
    const filter = this.getTrendQueryFilter(query, start, end, options.scopedVars);
    const requestBody = { filter, transitionInclusionOption: TransitionInclusionOption.All };
    const alarms = await this.queryAlarmsUntilComplete(requestBody);
    const alarmsWithTimestamp = this.enrichTransitionsWithTimestamp(alarms);

    const trendData = this.countActiveAlarmsPerInterval(
      alarmsWithTimestamp,
      startTime,
      endTime,
      intervalMs,
      query.groupBySeverity
    );
    return this.buildTrendDataFrame(query.refId, trendData, query.groupBySeverity);
  }

  private extractTimeParameters(options: DataQueryRequest) {
    const start = new Date(this.templateSrv.replace('${__from:date}', options.scopedVars));
    const end = new Date(this.templateSrv.replace('${__to:date}', options.scopedVars));
    const intervalMs = options.intervalMs;
    return { start, end, intervalMs };
  }

  private getTrendQueryFilter(query: AlarmsTrendQuery, start: Date, end: Date, scopedVars: ScopedVars): string {
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
      query.filter = this.transformAlarmsQuery(scopedVars, query.filter);
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

  private extractEvents(
    alarms: AlarmWithNumericTimeInTransitions[],
    endTime: number
  ): AlarmTransitionEvent[] {
    return alarms
      .flatMap(alarm => 
        alarm.transitions
          .map(transition => {
            const occurredAtAsNumber = transition.occurredAtAsNumber;
            return occurredAtAsNumber <= endTime ? {
              occurredAtAsNumber,
              alarmId: alarm.alarmId,
              type: transition.transitionType,
              severityLevel: transition.severityLevel
            } : null;
          })
          .filter((event): event is AlarmTransitionEvent => event !== null)
      )
      .sort((a, b) => a.occurredAtAsNumber - b.occurredAtAsNumber);
  }

  private countActiveAlarmsPerInterval(
    alarms: AlarmWithNumericTimeInTransitions[],
    startTime: number,
    endTime: number,
    intervalMs: number,
    groupBySeverity = false
  ): Map<number, Map<string, number>> {
    const alarmTransitionEvents = this.extractEvents(alarms, endTime);
    const alarmStates = new Map<string, { type: AlarmTransitionType; severityLevel: AlarmTransitionSeverityLevel }>();
    const intervalCounts = new Map<number, Map<string, number>>();
    let eventIndex = 0;

    for (let intervalStart = startTime; intervalStart <= endTime; intervalStart += intervalMs) {
      while (
        eventIndex < alarmTransitionEvents.length
        && alarmTransitionEvents[eventIndex].occurredAtAsNumber <= intervalStart
      ) {
        const event = alarmTransitionEvents[eventIndex];
        alarmStates.set(event.alarmId, {
          type: event.type,
          severityLevel: event.severityLevel
        });
        eventIndex++;
      }

      intervalCounts.set(
        intervalStart,
        this.calculateIntervalCounts(alarmStates, groupBySeverity)
      );
    }

    return intervalCounts;
  }

  private calculateIntervalCounts(
    alarmStates: Map<string, { type: AlarmTransitionType; severityLevel: AlarmTransitionSeverityLevel }>,
    groupBySeverity: boolean
  ): Map<string, number> {
    const counts = new Map<string, number>();

    if (groupBySeverity) { 
      Object.values(AlarmTrendSeverityLevelLabel).forEach(label => {
        counts.set(label, 0);
      });
      
      alarmStates.forEach(({ type, severityLevel }) => {
        const severityGroup = this.getSeverityGroup(severityLevel);
        if (type === AlarmTransitionType.Set && severityGroup !== undefined) {
          const currentCount = counts.get(severityGroup) ?? 0;
          counts.set(severityGroup, currentCount + 1);
        }
      });
    } else {
      let activeCount = 0;
      alarmStates.forEach(({ type }) => {
        if (type === AlarmTransitionType.Set) {
          activeCount++;
        }
      });

      counts.set(this.countKey, activeCount);
    }

    return counts;
  }

  private buildTrendDataFrame(
    refId: string,
    trendData: Map<number, Map<string, number>>,
    groupBySeverity = false
  ): DataFrameDTO {
    const timeValues = Array.from(trendData.keys());
    const fields = [
      {
        name: 'Time',
        type: FieldType.time,
        values: timeValues
      }
    ];

    if(groupBySeverity) {
      Object.values(AlarmTrendSeverityLevelLabel).forEach(group => {
        fields.push({
          name: group,
          type: FieldType.number,
          values: timeValues.map(timestamp => {
            const severityCounts = trendData.get(timestamp);
            return severityCounts?.get(group) ?? 0;
          })
        });
      });
    } else {
      fields.push({
        name: this.countKey,
        type: FieldType.number,
        values: timeValues.map(timestamp => trendData.get(timestamp)?.get(this.countKey) ?? 0)
      });
    }

    return {
      refId,
      name: refId,
      fields
    };
  }

  private getSeverityGroup(severityLevel: AlarmTransitionSeverityLevel): string | undefined {
    if (severityLevel >= AlarmTransitionSeverityLevel.Critical) {
      return AlarmTrendSeverityLevelLabel.Critical;
    }

    switch (severityLevel) {
      case AlarmTransitionSeverityLevel.Low:
        return AlarmTrendSeverityLevelLabel.Low;
      case AlarmTransitionSeverityLevel.Moderate:
        return AlarmTrendSeverityLevelLabel.Moderate;
      case AlarmTransitionSeverityLevel.High:
        return AlarmTrendSeverityLevelLabel.High;
      default:
        return undefined;
    }
  }
}
