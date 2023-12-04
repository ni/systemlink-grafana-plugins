
import { AssetUtilizationHistoryMock, startAMock, endAMock, startBMock, endBMock, peakDaysMock, intervalAMock, intervalBMock } from 'test/fixtures';
import { arraysEqual, calculateDailyUtilization, calculatePeakMilliseconds, convertTimeToUTC, extractTimestampesFromData, getBusinessHours, getLocalTimezoneOffsetInHours, mergeOverlappingIntervals, minuteInSeconds, patchMissingEndTimestamps, sortByStartTimestamp, splitIntervalsByDays } from './helper';
import { Interval, IntervalWithHeartbeat, IsPeak, UtilizationTimeFrequency } from './types';

afterEach(() => { jest.resetAllMocks(); /* reset because of timezone mock*/ })

describe('calculatePeakMilliseconds', () => {
  test('should calculate peak miliseconds', () => {
    const intervalMock: Interval<Date> = {
      startTimestamp: new Date('2023-11-20:00:00:00Z'),
      endTimestamp: new Date('2023-11-20:01:00:00Z')
    }

    const result = calculatePeakMilliseconds(intervalMock)

    expect(result).toBe(3600000)
  })
})

describe('getLocalTimezoneOffsetInHours', () => {
  test('should get local timezone offset in hours', () => {
    const offsetMock = 3
    Date.prototype.getTimezoneOffset = jest.fn(() => offsetMock * 60);

    const result = getLocalTimezoneOffsetInHours()

    expect(result).toBe(-offsetMock)
  })
})

describe('extractTimestampesFromData', () => {
  test('should extract timestamps from data', () => {
    const result = extractTimestampesFromData(AssetUtilizationHistoryMock)

    expect(result[0].startTimestamp).toBe(new Date(AssetUtilizationHistoryMock[0].startTimestamp).getTime())
    expect(result[0].endTimestamp).toBe(new Date(AssetUtilizationHistoryMock[0].endTimestamp!).getTime())
    expect(result[0].heartbeatTimestamp).toBe(new Date(AssetUtilizationHistoryMock[0].heartbeatTimestamp!).getTime())
    expect(result[1].startTimestamp).toBe(new Date(AssetUtilizationHistoryMock[1].startTimestamp).getTime())
    expect(result[1].endTimestamp).toBe(0)
    expect(result[1].heartbeatTimestamp).toBe(0)
  })
})

describe('convertTimeToUTC', () => {
  test('should convert timezone to UTC', () => {
    const startMock = '12:00:00'
    const endMock = '14:00:00'
    const timeZoneOffsetMock = 4

    const result = convertTimeToUTC(startMock, endMock, timeZoneOffsetMock)

    expect(result.startTime).toBe('08:00:00')
    expect(result.endTime).toBe('10:00:00')
  })
})

describe('sortByStartTimestamp', () => {
  test('sholud sort by timestamp', () => {
    const intervalsMock: Array<IntervalWithHeartbeat<number>> = [
      {
        startTimestamp: new Date('2023-11-21:00:00:00Z').getTime(),
        endTimestamp: new Date('2023-11-21:05:00:00Z').getTime(),
        heartbeatTimestamp: new Date('2023-11-21:10:00:00Z').getTime()
      },
      {
        startTimestamp: new Date('2023-11-20:00:00:00Z').getTime(),
        endTimestamp: new Date('2023-11-20:05:00:00Z').getTime(),
        heartbeatTimestamp: new Date('2023-11-20:10:00:00Z').getTime()
      }
    ]
    const expectedResult = [...intervalsMock] // create new array as function changes the array parameter

    const result = sortByStartTimestamp(intervalsMock)

    expect(result[0]).toStrictEqual(expectedResult[1])
    expect(result[1]).toStrictEqual(expectedResult[0])
  })

  test('should return original single item array', () => {
    const intervalsMock: Array<IntervalWithHeartbeat<number>> = [
      {
        startTimestamp: new Date('2023-11-21:00:00:00Z').getTime(),
        endTimestamp: new Date('2023-11-21:05:00:00Z').getTime(),
        heartbeatTimestamp: new Date('2023-11-21:10:00:00Z').getTime()
      }
    ]

    const result = sortByStartTimestamp(intervalsMock)

    expect(result[0]).toStrictEqual(intervalsMock[0])
  })
})

// describe('filterDataByTimeframe', () => {
//   test('should filter data', () => {
//     const intervalsMock: Array<IntervalWithHeartbeat<number>> = [
//       {
//         startTimestamp: new Date('2023-11-20').getTime(),
//         endTimestamp: new Date('2023-11-21').getTime(),
//         heartbeatTimestamp: new Date('2023-11-21').getTime()
//       },
//       {
//         startTimestamp: new Date('2023-11-21').getTime(),
//         endTimestamp: new Date('2023-11-22').getTime(),
//         heartbeatTimestamp: new Date('2023-11-22').getTime()
//       }
//     ]
//     const fromMock = new Date('2023-11-19').getTime()
//     const toMock = new Date('2023-11-21').getTime()

//     const result = filterDataByTimeframe(intervalsMock, fromMock, toMock)

//     expect(result.length).toBe(1)
//     expect(result[0]).toStrictEqual(intervalsMock[0])
//   })
// })

describe('patchMissingEndTimestamps', () => {
  test('should patch missing end timestamps with start and heartbeat timestamps', () => {
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
  test('should merge overlapping intervals', () => {
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

  test('should not merge non-overlapping interval', () => {
    const intervalsMock: Array<Interval<number>> = [
      {
        startTimestamp: startAMock.getTime(),
        endTimestamp: endAMock.getTime()
      },
      {
        startTimestamp: new Date('2023-11-20:03:00:00Z').getTime(),
        endTimestamp: new Date('2023-11-20:05:00:00Z').getTime()
      }
    ]

    const result = mergeOverlappingIntervals(intervalsMock)

    expect(result).toStrictEqual(intervalsMock)
  })

  test('should return original single item array', () => {
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

describe('getBusinessHours', () => {
  test('should get non-peak businessHours', () => {
    const initDateMock ='2023-11-20'
    const endDateMock = '2023-11-23'
    const startTimeMock = '09:00:00.000Z'
    const endTimeMock = '17:00:00.000Z'

    const result = getBusinessHours(new Date(initDateMock), new Date(endDateMock), { startTime: startTimeMock, endTime: endTimeMock }, IsPeak.NONPEAK, [], UtilizationTimeFrequency.DAILY)

    expect(result[0].startTimestamp.toISOString()).toBe(`${initDateMock}T${endTimeMock}`)
    expect(result[0].endTimestamp.toISOString()).toBe(`2023-11-21T${endTimeMock}`)
  })

  test('should get non-peak businessHours with full day policy', () => {
    const initDateMock ='2023-11-20'
    const endDateMock = '2023-11-23'
    const startTimeMock = '00:00:00.000Z'
    const endTimeMock = '00:00:00.000Z'

    const result = getBusinessHours(new Date(initDateMock), new Date(endDateMock), { startTime: startTimeMock, endTime: endTimeMock }, IsPeak.NONPEAK, [], UtilizationTimeFrequency.DAILY)

    expect(result[0].startTimestamp.toISOString()).toBe(`${initDateMock}T${startTimeMock}`)
    expect(result[0].endTimestamp.toISOString()).toBe(`2023-11-21T${endTimeMock}`)
  })

  test('should get peak businessHours', () => {
    const initDateMock = '2023-11-20'
    const endDateMock = '2023-11-21'
    const startTimeMock = '09:00:00.000Z'
    const endTimeMock = '17:00:00.000Z'

    const result = getBusinessHours(new Date(initDateMock), new Date(endDateMock), { startTime: startTimeMock, endTime: endTimeMock }, IsPeak.PEAK, peakDaysMock, UtilizationTimeFrequency.DAILY)

    expect(result[0].startTimestamp.toISOString()).toBe(`${initDateMock}T${startTimeMock}`)
    expect(result[0].endTimestamp.toISOString()).toBe(`${initDateMock}T${endTimeMock}`)
  })

  test('should get peak businessHours without peakDays', () => {
    const initDateMock = '2023-11-20'
    const endDateMock = '2023-11-22'
    const startTimeMock = '09:00:00.000Z'
    const endTimeMock = '17:00:00.000Z'

    const result = getBusinessHours(new Date(initDateMock), new Date(endDateMock), { startTime: startTimeMock, endTime: endTimeMock }, IsPeak.PEAK, [], UtilizationTimeFrequency.DAILY)
    expect(result[0].startTimestamp.toISOString()).toBe(`${initDateMock}T${startTimeMock}`)
    expect(result[0].endTimestamp.toISOString()).toBe(`${initDateMock}T${startTimeMock}`)
  })

  test('should get peak businessHours with hourly frequency', () => { 
    const initDateMock = '2023-11-20'
    const endDateMock = '2023-11-21'
    const startTimeMock = '09:00:00.000Z'
    const endTimeMock = '17:00:00.000Z'
    const expectedEndTimestamp = new Date(`${initDateMock}T${startTimeMock}`)
    expectedEndTimestamp.setHours(expectedEndTimestamp.getHours()+1)

    const result = getBusinessHours(new Date(initDateMock), new Date(endDateMock), { startTime: startTimeMock, endTime: endTimeMock }, IsPeak.PEAK, peakDaysMock, UtilizationTimeFrequency.HOURLY)
    
    expect(result[0].startTimestamp.toISOString()).toBe(`${initDateMock}T${startTimeMock}`)
    expect(result[0].endTimestamp.toISOString()).toBe(expectedEndTimestamp.toISOString())
  })
})

describe('calculateDailyUtilization', () => {
  test('should calculate daily utilization with peak seconds', () => {
    const dayMock = new Date('2023-11-20')
    const intervalsByDayMock: Array<{ day: Date, interval: Interval<Date>, overlapsWith: Date[][] }> = [
      {
        day: dayMock,
        interval: {
          startTimestamp: new Date('2023-11-20:00:00:00Z'),
          endTimestamp: new Date('2023-11-20:02:00:00Z')
        },
        overlapsWith: [
          [new Date('2023-11-20:00:00:00Z'), new Date('2023-11-20:01:00:00Z')]
        ]
      }
    ]

    const result = calculateDailyUtilization(intervalsByDayMock)

    expect(result.length).toBe(1)
    expect(result[0].utilization).toBe(50)
  })

  test('should calculate daily utilization with peak seconds', () => {
    const dayMock = new Date('2023-11-20')
    const timestampMock = new Date('2023-11-20:00:00:00Z')
    const intervalsByDayMock: Array<{ day: Date, interval: Interval<Date>, overlapsWith: Date[][] }> = [
      {
        day: dayMock,
        interval: {
          startTimestamp: timestampMock,
          endTimestamp: timestampMock
        },
        overlapsWith: []
      }
    ]

    const result = calculateDailyUtilization(intervalsByDayMock)

    expect(result.length).toBe(1)
    expect(result[0].utilization).toBe(0)
  })
})

describe('splitIntervalsByDays', () => {
  test('should split non-peak intervals', () => {
    const result = splitIntervalsByDays(intervalAMock, intervalBMock, [], IsPeak.NONPEAK)

    expect(result.length).toBe(1)
    expect(result[0].overlapsWith).toStrictEqual([[startBMock, endAMock]])
    expect(result[0].interval).toStrictEqual(
      {
        startTimestamp: startAMock,
        endTimestamp: endAMock
      })
  })

  test('should split peak intervals without overlaping', () => {
    const result = splitIntervalsByDays(intervalAMock, intervalBMock, peakDaysMock, IsPeak.PEAK)

    expect(result.length).toBe(1)
    expect(result[0].overlapsWith).toStrictEqual([[startBMock, endAMock]])
    expect(result[0].interval).toStrictEqual(
      {
        startTimestamp: startAMock,
        endTimestamp: endAMock
      })
  })

  test('should split peak intervals without overlaping', () => {
    const result = splitIntervalsByDays(intervalAMock, intervalBMock, [], IsPeak.PEAK)

    expect(result.length).toBe(1)
    expect(result[0].overlapsWith).toEqual([])
    expect(result[0].interval).toEqual(
      {
        startTimestamp: startAMock,
        endTimestamp: endAMock
      })
  })

  test('should split non-peak intervals (reverse intervals)', () => {
    const intervalAMock: Array<Interval<Date>> = [
      {
        startTimestamp: startBMock,
        endTimestamp: endBMock
      }
    ]

    const intervalBMock: Array<Interval<number>> = [
      {
        startTimestamp: startAMock.getTime(),
        endTimestamp: endAMock.getTime()
      }
    ]

    const result = splitIntervalsByDays(intervalAMock, intervalBMock, [], IsPeak.NONPEAK)

    expect(result.length).toBe(1)
    expect(result[0].overlapsWith).toStrictEqual([[startBMock, endAMock]])
    expect(result[0].interval).toStrictEqual(
      {
        startTimestamp: startBMock,
        endTimestamp: endBMock
      })
  })
})

describe('arraysEqual', () => {
  test('should return false with different size arrays', () => {
    const array1 = [1, 2]
    const array2 = [1, 2, 3]

    const result = arraysEqual(array1, array2)

    expect(result).toBeFalsy()
  })

  test('should return false with different array vlues', () => {
    const array1 = [1, 2, 3]
    const array2 = [1, 2, 5]

    const result = arraysEqual(array1, array2)

    expect(result).toBeFalsy()
  })

  test('should return true for identical arrays', () => {
    const array1 = [1, 2, 3]
    const array2 = [1, 2, 3]

    const result = arraysEqual(array1, array2)

    expect(result).toBeTruthy()
  })
})