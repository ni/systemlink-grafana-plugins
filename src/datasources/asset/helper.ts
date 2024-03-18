import {
  AssetUtilizationHistory,
  IntervalsWithPeakFlag,
  Interval,
  IntervalWithHeartbeat,
  IsPeak,
  TimeFrequency,
  Weekday,
} from "./types";
import { minuteInSeconds } from "./constants";

export const extractTimestampsFromData = (history: AssetUtilizationHistory[]): Array<IntervalWithHeartbeat<number>> => {
  return history.map((item) => {
    return {
      'startTimestamp': new Date(item.startTimestamp).getTime(),
      'endTimestamp': item.endTimestamp ? new Date(item.endTimestamp).getTime() : 0,
      'heartbeatTimestamp': item.heartbeatTimestamp ? new Date(item.heartbeatTimestamp).getTime() : 0
    }
  })
}

export const patchMissingEndTimestamps = (history: Array<IntervalWithHeartbeat<number>>): Array<Interval<number>> => {
  return history.map((item: IntervalWithHeartbeat<number>) => {
    let newItem: Interval<number> = {
      'startTimestamp': new Date(item.startTimestamp).getTime(),
      'endTimestamp': 0
    }
    if (!item.endTimestamp) {
      if (!item.heartbeatTimestamp) {
        newItem.endTimestamp = new Date(item.startTimestamp).getTime() + 10 * minuteInSeconds
      } else {
        newItem.endTimestamp = new Date(item.heartbeatTimestamp).getTime()
      }
    } else {
      newItem.endTimestamp = new Date(item.endTimestamp).getTime()
    }

    return newItem
  })
}

export const filterDataByTimeRange = (data: Array<Interval<number>>, from: number, to: number): Array<Interval<number>> => {
  return data.filter((interval: Interval<number>) => {
    return interval.endTimestamp > from && interval.startTimestamp < to;
  })
}

export const mergeOverlappingIntervals = (intervals: Array<Interval<number>>): Array<Interval<number>> => {
  if (intervals.length <= 1) {
    return intervals;
  }
  const mergedIntervals = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const currentInterval = intervals[i];
    const previousInterval = mergedIntervals[mergedIntervals.length - 1];

    if (currentInterval.startTimestamp <= previousInterval.endTimestamp) {
      // Overlapping intervals, merge them
      mergedIntervals[mergedIntervals.length - 1].endTimestamp = Math.max(
        previousInterval.endTimestamp,
        currentInterval.endTimestamp
      );
    } else {
      // Non-overlapping intervals, add the current interval to the result
      mergedIntervals.push(currentInterval);
    }
  }

  return mergedIntervals;
}

export const groupDataByIntervals = (
  businessIntervals: Array<IntervalsWithPeakFlag<Date>>,
  utilizationIntervals: Array<Interval<number>>,
  peakDays: Weekday[],
  isPeak: IsPeak
): Array<{ day: Date, interval: IntervalsWithPeakFlag<Date>, overlapsWith: Date[][] }> => {
  let overlaps = [];

  for (let businessInterval of businessIntervals) {
    let overlappingSegments = [];
    for (let utilizationInterval of utilizationIntervals) {
      let businessIntervalStart = new Date(businessInterval['startTimestamp']);
      let businessIntervalEnd = new Date(businessInterval["endTimestamp"]);
      let utilizationIntervalStart = new Date(utilizationInterval['startTimestamp']);
      let utilizationIntervalEnd = new Date(utilizationInterval["endTimestamp"]);
      // Check for overlap
      if (businessIntervalStart < utilizationIntervalEnd && utilizationIntervalStart < businessIntervalEnd) {
        // Overlapping interval found
        let overlapStart = businessIntervalStart > utilizationIntervalStart ? businessIntervalStart : utilizationIntervalStart;
        let overlapEnd = businessIntervalEnd < utilizationIntervalEnd ? businessIntervalEnd : utilizationIntervalEnd;
        overlappingSegments.push([overlapStart, overlapEnd]);
      }
    }
    if (isPeak === IsPeak.NONPEAK) {
      if (!businessInterval.isWorking) {
        overlaps.push({
          day: businessInterval.startTimestamp,
          interval: businessInterval,
          overlapsWith: overlappingSegments
        });
      }
    } else {
      if (businessInterval.isWorking) {
        overlaps.push({
          day: businessInterval.startTimestamp,
          interval: businessInterval,
          overlapsWith: overlappingSegments
        });
      }
    }
  }

  return overlaps;
}

export const calculatePeakMilliseconds = (businessHours: IntervalsWithPeakFlag<Date>): number => {
  let { startTimestamp, endTimestamp } = businessHours
  return endTimestamp.getTime() - startTimestamp.getTime()
}

export const calculateUtilization = (intervalsByDay: Array<{
  day: Date,
  interval: IntervalsWithPeakFlag<Date>,
  overlapsWith: Date[][]
}>): Array<{ day: Date, utilization: number }> => {
  const utilization: Array<{ day: Date, utilization: number }> = []

  for (const intervals of intervalsByDay) {
    const peakSecondsInDay = calculatePeakMilliseconds(intervals.interval)
    let utilizationInSeconds = 0
    for (const interval of intervals.overlapsWith) {
      utilizationInSeconds += interval[1].getTime() - interval[0].getTime()
    }
    if (peakSecondsInDay === 0) {
      utilization.push({ 'day': intervals.day, utilization: 0 })
    } else {
      utilization.push({
        'day': intervals.day,
        utilization: (utilizationInSeconds * 100) / peakSecondsInDay
      })
    }
  }

  return utilization
}

export const arraysEqual = (arr1: any[], arr2: any[]): boolean => {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}

export const momentToTime = (date: any): string => {
  const hours = (String(date.hour())).padStart(2, '0')
  const minutes = (String(date.minute())).padStart(2, '0')
  const seconds = (String(date.second())).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

export const addDays = (currentDate: Date, daysToAdd: number): Date => {
  const dateCopy = new Date(currentDate.getTime());
  dateCopy.setDate(dateCopy.getDate() + daysToAdd);
  return dateCopy;
}

export const addHours = (currentDate: Date, hoursToAdd: number): Date => {
  const dateCopy = new Date(currentDate.getTime());
  dateCopy.setHours(dateCopy.getHours() + hoursToAdd);
  return dateCopy;
}

export const addMilliseconds = (currentDate: Date, millisecondsToAdd: number): Date => {
  const dateCopy = new Date(currentDate.getTime());
  dateCopy.setMilliseconds(dateCopy.getMilliseconds() + millisecondsToAdd);
  return dateCopy;
}

export const splitDailyIntervalsToHourly = (interval: IntervalsWithPeakFlag<Date>): Array<IntervalsWithPeakFlag<Date>> => {

  const intervals: Array<IntervalsWithPeakFlag<Date>> = [];
  let currentStart = new Date(interval.startTimestamp);
  const end = new Date(interval.endTimestamp);

  // Adjust the start time to the next full hour if it's not already a full hour
  let firstIntervalEnd = new Date(currentStart);
  firstIntervalEnd.setHours(firstIntervalEnd.getHours() + 1);
  if (currentStart.getMinutes() !== 0) {
    firstIntervalEnd.setMinutes(0, 0, 0); // Reset minutes, seconds, milliseconds
  }
  // First interval
  intervals.push({
    startTimestamp: currentStart,
    endTimestamp: firstIntervalEnd,
    isWorking: interval.isWorking
  });
  // Update currentStart to the end of the first interval
  currentStart = firstIntervalEnd;
  // Middle intervals
  while (currentStart < end) {
    let intervalEnd = new Date(currentStart);
    intervalEnd.setHours(intervalEnd.getHours() + 1);
    if (intervalEnd >= end) {
      break; // Don't add this interval if it exceeds the endTime
    }
    intervals.push({
      startTimestamp: currentStart,
      endTimestamp: intervalEnd,
      isWorking: interval.isWorking
    });
    currentStart = intervalEnd; // Prepare for the next iteration
  }
  // Final interval, if there's a remainder
  if (currentStart < end) {
    intervals.push({
      startTimestamp: currentStart,
      endTimestamp: end,
      isWorking: interval.isWorking
    });
  }
  return intervals;
}

export const patchZeroPoints = (
  data: Array<{ day: Date, utilization: number }>,
  from: Date,
  to: Date,
  frequency: TimeFrequency
): Array<{ day: Date, utilization: number }> => {
  if (data.length === 0) {
    return [];
  }
  const patchedData: Array<{ day: Date, utilization: number }> = [];
  if (frequency === TimeFrequency.DAILY) {
    for (let i = 0; i < data.length - 1; i++) {
      patchedData.push(data[i])
      let currentDate = new Date(data[i].day);
      let nextDate = new Date(data[i + 1].day);
      while (getTimeFromEpoch(currentDate, frequency) + 1 < getTimeFromEpoch(nextDate, frequency)) {
        currentDate = addDays(currentDate, 1)
        patchedData.push({ day: currentDate, utilization: 0 })
      }
    }
    // add last value
    patchedData.push(data[data.length - 1])
  } else {
    for (let i = 0; i < data.length - 1; i++) {
      patchedData.push(data[i])
      let currentDate = data[i].day
      let nextDate = new Date(data[i + 1].day);
      while (getTimeFromEpoch(currentDate, frequency) + 1 < getTimeFromEpoch(nextDate, frequency)) {
        currentDate = addHours(currentDate, 1)
        patchedData.push({ day: currentDate, utilization: 0 })
      }
    }
    // add last value
    patchedData.push(data[data.length - 1])
  }

  return patchedData;
}

export const getTimeFromEpoch = (date: Date, frequency: TimeFrequency): number => {
  const milliseconds = date.getTime();
  switch (frequency) {
    case TimeFrequency.HOURLY:
      return Math.floor(milliseconds / 1000 / 3600);
    case TimeFrequency.DAILY:
      return Math.floor(milliseconds / 1000 / 3600 / 24);
    default:
      throw new Error('Invalid frequency provided');
  }
}

export const divideTimeRangeToBusinessIntervals = (
  rangeStart: Date,
  rangeEnd: Date,
  workingHours: {
    startTime: string,
    endTime: string
  },
  peakDays: Weekday[],
  timeFrequency: TimeFrequency
): Array<IntervalsWithPeakFlag<Date>> => {
  const intervals: Array<IntervalsWithPeakFlag<Date>> = [];

  let startTimeParts = workingHours.startTime.split(":").map(Number);
  let endTimeParts = workingHours.endTime.split(":").map(Number);
  let peakMillisecondsInDay = Math.abs(new Date().setHours(startTimeParts[0], startTimeParts[1], 0, 0) - new Date().setHours(endTimeParts[0], endTimeParts[1], 0, 0))
  let nonPeakMillisecondsInDay = 24 * 60 * 60 * 1000 - peakMillisecondsInDay

  const dayOfWeek = rangeStart.getDay();
  const isWeekend = !peakDays.includes(dayOfWeek)

  let currentDayPeakStart = new Date(new Date(rangeStart).setHours(startTimeParts[0], startTimeParts[1], 0, 0))
  let currentDayNonPeakStart = new Date(new Date(rangeStart).setHours(endTimeParts[0], endTimeParts[1], 0, 0))
  let nextDayPeakStart = addDays(new Date(new Date(rangeStart).setHours(startTimeParts[0], startTimeParts[1], 0, 0)), 1)
  let nextDayNonPeakStart = addDays(new Date(new Date(rangeStart).setHours(endTimeParts[0], endTimeParts[1], 0, 0)), 1)

  if (currentDayNonPeakStart > rangeEnd) {
    currentDayNonPeakStart = rangeEnd
  }
  if (nextDayPeakStart > rangeEnd) {
    nextDayPeakStart = rangeEnd
  }
  if (nextDayNonPeakStart > rangeEnd) {
    nextDayNonPeakStart = rangeEnd
  }

  if (isWeekend) {
    intervals.push({
      startTimestamp: rangeStart,
      endTimestamp: nextDayPeakStart,
      isWorking: false
    })
    currentDayPeakStart = new Date(nextDayPeakStart)
  } else {
    if (currentDayPeakStart < currentDayNonPeakStart) {
      if (rangeStart < currentDayPeakStart) {
        intervals.push({
          startTimestamp: rangeStart,
          endTimestamp: currentDayPeakStart,
          isWorking: false
        })
        // is same
        // currentDayPeakStart = new Date(currentDayPeakStart)
      } else if (currentDayPeakStart <= rangeStart && rangeStart < currentDayNonPeakStart) {
        intervals.push({
          startTimestamp: rangeStart,
          endTimestamp: currentDayNonPeakStart,
          isWorking: true
        })
        intervals.push({
          startTimestamp: currentDayNonPeakStart,
          endTimestamp: nextDayPeakStart,
          isWorking: false
        })
        currentDayPeakStart = new Date(nextDayPeakStart)
      } else {
        intervals.push({
          startTimestamp: rangeStart,
          endTimestamp: nextDayPeakStart,
          isWorking: false
        })
        currentDayPeakStart = new Date(nextDayPeakStart)
      }
    } else if (currentDayPeakStart > currentDayNonPeakStart) {
      if (rangeStart < currentDayNonPeakStart) {
        intervals.push({
          startTimestamp: rangeStart,
          endTimestamp: currentDayNonPeakStart,
          isWorking: true
        })
        intervals.push({
          startTimestamp: currentDayNonPeakStart,
          endTimestamp: currentDayPeakStart,
          isWorking: false
        })
      } else if (currentDayNonPeakStart <= rangeStart && rangeStart < currentDayPeakStart) {
        intervals.push({
          startTimestamp: rangeStart,
          endTimestamp: currentDayPeakStart,
          isWorking: false
        })
        // is same
        // currentDayPeakStart = new Date(currentDayPeakStart)
      } else {
        intervals.push({
          startTimestamp: rangeStart,
          endTimestamp: nextDayNonPeakStart,
          isWorking: true
        })
        intervals.push({
          startTimestamp: nextDayNonPeakStart,
          endTimestamp: nextDayPeakStart,
          isWorking: false
        })
        currentDayPeakStart = new Date(nextDayPeakStart)
      }
    } else {
      intervals.push({
        startTimestamp: rangeStart,
        endTimestamp: nextDayPeakStart,
        isWorking: true
      })
      currentDayPeakStart = new Date(nextDayPeakStart)
    }
  }
  let start = new Date(currentDayPeakStart)

  while (rangeEnd >= start) {
    const dayOfWeek = start.getDay();
    const isWeekend = !peakDays.includes(dayOfWeek)

    let currentDayPeakStart = new Date(new Date(start).setHours(startTimeParts[0], startTimeParts[1], 0, 0))
    let currentDayNonPeakStart = addMilliseconds(currentDayPeakStart, peakMillisecondsInDay)
    let nextDayPeakStart = addMilliseconds(currentDayNonPeakStart, nonPeakMillisecondsInDay)

    if (isWeekend) {
      intervals.push({
        startTimestamp: start,
        endTimestamp: nextDayPeakStart,
        isWorking: false
      })
    } else {
      if (currentDayPeakStart < currentDayNonPeakStart) {
        if (currentDayNonPeakStart >= rangeEnd) {
          intervals.push({
            startTimestamp: currentDayPeakStart,
            endTimestamp: rangeEnd,
            isWorking: true
          })
          break
        } else {
          intervals.push({
            startTimestamp: currentDayPeakStart,
            endTimestamp: currentDayNonPeakStart,
            isWorking: true
          })
        }
        if (nextDayPeakStart >= rangeEnd) {
          intervals.push({
            startTimestamp: currentDayNonPeakStart,
            endTimestamp: rangeEnd,
            isWorking: false
          })
          break
        } else {
          intervals.push({
            startTimestamp: currentDayNonPeakStart,
            endTimestamp: nextDayPeakStart,
            isWorking: false
          })
        }
      } else {
        intervals.push({
          startTimestamp: currentDayPeakStart,
          endTimestamp: nextDayPeakStart,
          isWorking: true
        })
        currentDayPeakStart = new Date(nextDayPeakStart)
      }
    }
    start = new Date(nextDayPeakStart)
  }

  if (timeFrequency === TimeFrequency.HOURLY) {
    const hourlyIntervals: Array<IntervalsWithPeakFlag<Date>> = []
    intervals.forEach((interval: IntervalsWithPeakFlag<Date>) => {
      hourlyIntervals.push(...splitDailyIntervalsToHourly(interval))
    })
    return hourlyIntervals
  }

  return intervals
}
