import {
  AssetUtilizationHistoryMock,
  endAMock,
  endBMock,
  intervalAMock,
  intervalBMock,
  peakDaysMock,
  startAMock,
  startBMock
} from 'test/fixtures';
import {
  arraysEqual,
  calculateUtilization,
  calculatePeakMilliseconds,
  divideTimeRangeToBusinessIntervals,
  extractTimestampsFromData,
  groupDataByIntervals,
  mergeOverlappingIntervals,
  patchMissingEndTimestamps,
} from './helper';
import { IntervalsWithPeakFlag, Interval, IntervalWithHeartbeat, IsPeak, TimeFrequency, Weekday } from './types';
import { minuteInSeconds } from "./constants";

afterEach(() => {
  jest.resetAllMocks(); /* reset because of timezone mock*/
})

test('calculates peak milliseconds', () => {
  const intervalMock: IntervalsWithPeakFlag<Date> = {
    startTimestamp: new Date('2023-11-20:00:00:00Z'),
    endTimestamp: new Date('2023-11-20:01:00:00Z'),
    isWorking: true
  }

  const result = calculatePeakMilliseconds(intervalMock)

  expect(result).toBe(3600000)
})

test('extracts timestamps from data', () => {
  const result = extractTimestampsFromData(AssetUtilizationHistoryMock)

  expect(result[0].startTimestamp).toBe(new Date(AssetUtilizationHistoryMock[0].startTimestamp).getTime())
  expect(result[0].endTimestamp).toBe(new Date(AssetUtilizationHistoryMock[0].endTimestamp!).getTime())
  expect(result[0].heartbeatTimestamp).toBe(new Date(AssetUtilizationHistoryMock[0].heartbeatTimestamp!).getTime())
  expect(result[1].startTimestamp).toBe(new Date(AssetUtilizationHistoryMock[1].startTimestamp).getTime())
  expect(result[1].endTimestamp).toBe(0)
  expect(result[1].heartbeatTimestamp).toBe(0)
})

describe('patchMissingEndTimestamps', () => {
  test('patches missing end timestamps with start and heartbeat timestamps', () => {
    const historyMock: Array<IntervalWithHeartbeat<number>> = [
      {
        startTimestamp: new Date('2023-11-20:00:00:00Z').getTime(),
        endTimestamp: new Date('2023-11-20:02:00:00Z').getTime(),
        heartbeatTimestamp: new Date('2023-11-20:01:00:00Z').getTime(),
      },
      {
        startTimestamp: new Date('2023-11-21:00:00:00Z').getTime(),
        endTimestamp: 0,
        heartbeatTimestamp: new Date('2023-11-21:01:00:00Z').getTime(),
      },
      {
        startTimestamp: new Date('2023-11-22:00:00:00Z').getTime(),
        endTimestamp: 0,
        heartbeatTimestamp: 0,
      }
    ]

    const result = patchMissingEndTimestamps(historyMock)

    expect(result[0].endTimestamp).toBe(historyMock[0].endTimestamp)
    expect(result[1].endTimestamp).toBe(historyMock[1].heartbeatTimestamp)
    expect(result[2].endTimestamp).toBe(historyMock[2].startTimestamp + 10 * minuteInSeconds)
  })
})

describe('mergeOverlappingIntervals', () => {
  test('merges overlapping intervals', () => {
    const intervalsMock: Array<Interval<number>> = [
      {
        startTimestamp: startAMock.getTime(),
        endTimestamp: endAMock.getTime()
      },
      {
        startTimestamp: startBMock.getTime(),
        endTimestamp: endBMock.getTime()
      }
    ]

    const result = mergeOverlappingIntervals(intervalsMock)

    expect(result[0].startTimestamp).toBe(startAMock.getTime())
    expect(result[0].endTimestamp).toBe(endBMock.getTime())
  })

  test('does not merge non-overlapping interval', () => {
    const intervalsMock: Array<Interval<number>> = [
      {
        startTimestamp: new Date('2023-11-20:03:00:00Z').getTime(),
        endTimestamp: new Date('2023-11-20:05:00:00Z').getTime()
      },
      {
        startTimestamp: startAMock.getTime(),
        endTimestamp: endAMock.getTime()
      }
    ]

    const result = mergeOverlappingIntervals(intervalsMock)

    expect(result).toStrictEqual(intervalsMock)
  })

  test('returns original single item array', () => {
    const intervalsMock: Array<Interval<number>> = [
      {
        startTimestamp: startAMock.getTime(),
        endTimestamp: endAMock.getTime()
      }
    ]

    const result = mergeOverlappingIntervals(intervalsMock)

    expect(result).toStrictEqual(intervalsMock)
  })
})

describe('divideTimeRangeToBusinessIntervals', () => {

  it('should handle non-peak days as non-working intervals', () => {
    const rangeStart = new Date('2024-03-16T08:00:00Z'); // Monday
    const rangeEnd = new Date('2024-03-17T18:00:00Z');
    const workingHours = { startTime: '09:00', endTime: '17:00' };
    const peakDays = [Weekday.Saturday, Weekday.Sunday]; // Non-peak days are weekdays here
    const timeFrequency = TimeFrequency.DAILY;

    const intervals = divideTimeRangeToBusinessIntervals(rangeStart, rangeEnd, workingHours, peakDays, timeFrequency);
    expect(intervals).toHaveLength(5); // Since it's a non-peak weekday, the whole interval is marked as non-working
    expect(intervals).toStrictEqual([
      {
        "endTimestamp": new Date("2024-03-16T09:00:00.000Z"),
        "isWorking": false,
        "startTimestamp": new Date("2024-03-16T08:00:00.000Z")
      },
      {
        "endTimestamp": new Date("2024-03-16T17:00:00.000Z"),
        "isWorking": true,
        "startTimestamp": new Date("2024-03-16T09:00:00.000Z")
      },
      {
        "endTimestamp": new Date("2024-03-17T09:00:00.000Z"),
        "isWorking": false,
        "startTimestamp": new Date("2024-03-16T17:00:00.000Z")
      },
      {
        "endTimestamp": new Date("2024-03-17T17:00:00.000Z"),
        "isWorking": true,
        "startTimestamp": new Date("2024-03-17T09:00:00.000Z")
      },
      {
        "endTimestamp": new Date("2024-03-17T18:00:00.000Z"),
        "isWorking": false,
        "startTimestamp": new Date("2024-03-17T17:00:00.000Z")
      }
    ])
  });

  it('should split intervals correctly for hourly frequency across a working and non-working boundary', () => {
    const rangeStart = new Date('2024-03-15T08:00:00Z'); // Friday
    const rangeEnd = new Date('2024-03-15T10:00:00Z');
    const workingHours = { startTime: '09:00', endTime: '17:00' };
    const peakDays = [Weekday.Monday, Weekday.Tuesday, Weekday.Wednesday, Weekday.Thursday, Weekday.Friday];
    const timeFrequency = TimeFrequency.HOURLY;

    const intervals = divideTimeRangeToBusinessIntervals(rangeStart, rangeEnd, workingHours, peakDays, timeFrequency);
    expect(intervals).toHaveLength(2); // Should be split into one non-working hour and one working hour
    expect(intervals[0].isWorking).toBeFalsy();
    expect(intervals[1].isWorking).toBeTruthy();
  });
})

describe('calculateUtilization', () => {
  test('calculates daily utilization with peak seconds 1', () => {
    const dayMock = new Date('2023-11-20')
    const intervalsByDayMock: Array<{ day: Date, interval: IntervalsWithPeakFlag<Date>, overlapsWith: Date[][] }> = [
      {
        day: dayMock,
        interval: {
          startTimestamp: new Date('2024-03-11:00:00:00Z'),
          endTimestamp: new Date('2024-03-11:02:00:00Z'),
          isWorking: true
        },
        overlapsWith: [
          [new Date('2024-03-11:00:00:00Z'), new Date('2024-03-11:01:00:00Z')]
        ]
      }
    ]

    const result = calculateUtilization(intervalsByDayMock)

    expect(result.length).toBe(1)
    expect(result[0].utilization).toBe(50)
  })

  test('calculates daily utilization with peak seconds 2', () => {
    const dayMock = new Date('2024-03-11')
    const timestampMock = new Date('2024-03-11:00:00:00Z')
    const intervalsByDayMock: Array<{ day: Date, interval: IntervalsWithPeakFlag<Date>, overlapsWith: Date[][] }> = [
      {
        day: dayMock,
        interval: {
          startTimestamp: timestampMock,
          endTimestamp: timestampMock,
          isWorking: true
        },
        overlapsWith: []
      }
    ]

    const result = calculateUtilization(intervalsByDayMock)

    expect(result.length).toBe(1)
    expect(result[0].utilization).toBe(0)
  })
})

describe('groupDataByIntervals', () => {
  test('splits non-peak intervals', () => {
    const result = groupDataByIntervals(intervalAMock, intervalBMock, [], IsPeak.NONPEAK)

    expect(result.length).toBe(0)
  })

  test('splits peak intervals without overlapping', () => {
    const result = groupDataByIntervals(intervalAMock, intervalBMock, peakDaysMock, IsPeak.PEAK)

    expect(result.length).toBe(1)
    expect(result[0].overlapsWith).toStrictEqual([[startBMock, endAMock]])
    expect(result[0].interval).toStrictEqual(
      {
        startTimestamp: startAMock,
        endTimestamp: endAMock,
        isWorking: true
      })
  })

  test('splits non-peak intervals (reverse intervals)', () => {
    const intervalAMock: Array<IntervalsWithPeakFlag<Date>> = [
      {
        startTimestamp: startBMock,
        endTimestamp: endBMock,
        isWorking: true
      }
    ]

    const intervalBMock: Array<Interval<number>> = [
      {
        startTimestamp: startAMock.getTime(),
        endTimestamp: endAMock.getTime()
      }
    ]

    const result = groupDataByIntervals(intervalAMock, intervalBMock, [], IsPeak.NONPEAK)

    expect(result.length).toBe(0)
  })
})

describe('arraysEqual', () => {
  test('returns false with different size arrays', () => {
    const array1 = [1, 2]
    const array2 = [1, 2, 3]

    const result = arraysEqual(array1, array2)

    expect(result).toBeFalsy()
  })

  test('returns false with different array vlues', () => {
    const array1 = [1, 2, 3]
    const array2 = [1, 2, 5]

    const result = arraysEqual(array1, array2)

    expect(result).toBeFalsy()
  })

  test('returns true for identical arrays', () => {
    const array1 = [1, 2, 3]
    const array2 = [1, 2, 3]

    const result = arraysEqual(array1, array2)

    expect(result).toBeTruthy()
  })
})
