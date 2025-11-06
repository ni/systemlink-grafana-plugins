import { DataFrameDTO, DataQueryRequest, FieldType } from '@grafana/data';
import { AlarmsQueryHandlerCore } from 'datasources/alarms/query-type-handlers/AlarmsQueryHandlerCore';
import { defaultAlarmsTrendQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { AlarmsTrendQuery, AlarmTrendSeverityLevelLabel } from 'datasources/alarms/types/AlarmsTrend.types';
import { Alarm, AlarmTransition, AlarmTransitionSeverityLevel, AlarmTransitionType, TransitionInclusionOption } from 'datasources/alarms/types/types';

interface AlarmEvent {
  timestamp: number;
  alarmId: string;
  newState: boolean;
  severityLevel: AlarmTransitionSeverityLevel;
};

export class AlarmsTrendQueryHandler extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultAlarmsTrendQuery;

  public async runQuery(query: AlarmsTrendQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const { start, end, intervalMs } = this.extractTimeParameters(options);
    const startTime = start.getTime();
    const endTime = end.getTime();
    const filter = this.getTrendQueryFilter(query, start, end);
    const alarms = await this.queryAlarmsUntilComplete({ filter, transitionInclusionOption: TransitionInclusionOption.All });
    const alarmsWithTimestamp = this.enrichTransitionsWithTimestamp(alarms);

    if (query.groupBySeverity) {
      const trendDataBySeverity = this.countActiveAlarmsPerIntervalBySeverity(alarmsWithTimestamp, startTime, endTime, intervalMs);
      return this.buildGroupedDataFrameBySeverity(query.refId, trendDataBySeverity);
    }

    const trendData = this.countActiveAlarmsPerInterval(alarmsWithTimestamp, startTime, endTime, intervalMs);
    return this.buildGroupedDataFrame(query.refId, trendData);
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
      transitions: (alarm.transitions?.map((transition: AlarmTransition, index: number) => ({
        ...transition,
        timestamp: new Date(transition.occurredAt).getTime(),
      })) ?? []).sort((a, b) => a.timestamp - b.timestamp)
    }));
  }

  private extractEvents(alarms: Alarm[], endTime: number): AlarmEvent[] {
    const events: AlarmEvent[] = [];

    alarms.forEach(alarm => {
      for (const transition of alarm.transitions) {
        const timestamp = transition.timestamp;
        
        if (timestamp > endTime) {
          break;
        }
        
        events.push({
          timestamp,
          alarmId: alarm.alarmId,
          newState: transition.transitionType === AlarmTransitionType.Set,
          severityLevel: transition.severityLevel
        });
      }
    });

    events.sort((a, b) => a.timestamp - b.timestamp);

    return events;
  }

  private countActiveAlarmsPerInterval(alarms: Alarm[], startTime: number, endTime: number, intervalMs: number): Map<number, number> {
    const intervalCounts = new Map<number, number>();
    const events = this.extractEvents(alarms, endTime);
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

  private buildGroupedDataFrame(refId: string, trendData: Map<number, number>): DataFrameDTO {
    return {
      refId: refId,
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
    }
  }

  private countActiveAlarmsPerIntervalBySeverity(alarms: Alarm[], startTime: number, endTime: number, intervalMs: number): Map<number, Map<string, number>> {
    const intervalCountsBySeverity = new Map<number, Map<string, number>>();
    const events = this.extractEvents(alarms, endTime);
    const alarmStates = new Map<string, { isActive: boolean; severityLevel: AlarmTransitionSeverityLevel }>();
    let eventIndex = 0;

    for (let intervalStart = startTime; intervalStart < endTime; intervalStart += intervalMs) {
      while (eventIndex < events.length && events[eventIndex].timestamp < intervalStart) {
        const event = events[eventIndex];
        alarmStates.set(event.alarmId, {
          isActive: event.newState,
          severityLevel: event.severityLevel
        });
        eventIndex++;
      }
      
      const severityCounts = new Map<string, number>();
      Object.values(AlarmTrendSeverityLevelLabel).forEach(label => {
        severityCounts.set(label, 0);
      });
      
      alarmStates.forEach(({ isActive, severityLevel }) => {
        const severityGroup = this.getSeverityGroup(severityLevel);
        if (isActive && severityGroup !== undefined) {
          const currentCount = severityCounts.get(severityGroup) ?? 0;
          severityCounts.set(severityGroup, currentCount + 1);
        }
      });
      
      intervalCountsBySeverity.set(intervalStart, severityCounts);
    }
    
    return intervalCountsBySeverity;
  }

  private buildGroupedDataFrameBySeverity(refId: string, trendDataBySeverity: Map<number, Map<string, number>>): DataFrameDTO {
    const timeValues = Array.from(trendDataBySeverity.keys());
    const fields = [
      {
        name: 'Time',
        type: FieldType.time,
        values: timeValues
      }
    ];
    
    Object.values(AlarmTrendSeverityLevelLabel).forEach(group => {
      fields.push({
        name: group,
        type: FieldType.number,
        values: timeValues.map(timestamp => {
          const severityCounts = trendDataBySeverity.get(timestamp);
          return severityCounts?.get(group) || 0;
        })
      });
    });
    
    return {
      refId,
      name: 'Alarms Trend by Severity',
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
        return undefined
    }
  }
}
