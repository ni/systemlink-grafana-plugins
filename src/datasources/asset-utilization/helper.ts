import {
    AssetUtilizationHistory,
    Interval,
    IntervalWithHeartbeat,
    IsPeak, SystemLinkError,
    UtilizationTimeFrequency,
    Weekday
} from "./types";

export const minuteInSeconds = 60 * 1000;
export const getLocalTimezoneOffsetInHours = () => {
    // Get the current date
    const currentDate = new Date();

    // Get the timezone offset in minutes
    const offsetInMinutes = currentDate.getTimezoneOffset();

    // Convert the offset to hours and change the sign
    return -offsetInMinutes / 60;
}

export const convertTimeToUTC = (start: string, end: string, timeZoneOffset: number) => {
    // Convert the start and end times to Date objects
    let startDate = new Date('1970-01-01T' + start + 'Z');
    let endDate = new Date('1970-01-01T' + end + 'Z');

    // Adjust for the time zone offset
    startDate.setHours(startDate.getHours() - timeZoneOffset);
    endDate.setHours(endDate.getHours() - timeZoneOffset);

    // Format the Date objects back to time strings
    let startTime = startDate.toISOString().split('T')[1].substr(0, 8);
    let endTime = endDate.toISOString().split('T')[1].substr(0, 8);

    return {startTime, endTime};
}

export const extractTimestampesFromData = (history: AssetUtilizationHistory[]) => {
    return history.map((item) => {
        return {
            'startTimestamp': new Date(item.startTimestamp).getTime(),
            'endTimestamp': item.endTimestamp ? new Date(item.endTimestamp).getTime() : 0,
            'heartbeatTimestamp': item.heartbeatTimestamp ? new Date(item.heartbeatTimestamp).getTime() : 0
        }
    })
}

export const sortByStartTimestamp = (intervals: Array<IntervalWithHeartbeat<number>>) => {
    if (intervals.length <= 1) {
        return intervals;
    }

    // Sort intervals based on the startTimestamp
    intervals.sort((a, b) => a.startTimestamp - b.startTimestamp);

    return intervals
}
export const patchMissingEndTimestamps = (history: Array<IntervalWithHeartbeat<number>>) => {
    return history.map((item, index) => {
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

export const filterDataByTimeRange = (data: Array<Interval<number>>, from: number, to: number) => {
    return data.filter((interval: Interval<number>) => {
        return interval.endTimestamp > from && interval.startTimestamp < to;
    })
}
export const mergeOverlappingIntervals = (intervals: Array<Interval<number>>) => {
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

export const getBusinessHours = (
    initDate: Date,
    endDate: Date,
    limit: {
        startTime: string,
        endTime: string,
    },
    isPeak: IsPeak,
    peakDays: Weekday[],
    frequency: UtilizationTimeFrequency
): Array<{ startTimestamp: Date, endTimestamp: Date }> => {
    const resArr = []
    let startTimeParts = limit.startTime.split(':');
    let endTimeParts = limit.endTime.split(':');

    if (isPeak === IsPeak.NONPEAK) {
        [startTimeParts, endTimeParts] = [endTimeParts, startTimeParts];
    }
    let start, end
    if (endTimeParts[0] > startTimeParts[0]) {
        //start and end of while in day same day

        start = new Date(initDate)
        end = new Date(initDate)
    } else if (endTimeParts[0] < startTimeParts[0]) {
        //start and end of whp in day different days

        start = new Date(initDate)
        end = new Date(initDate)
        end.setDate(end.getDate() + 1)
    } else {
        //full day utilization / non-peak

        start = new Date(initDate)
        end = new Date(initDate)
        end.setDate(end.getDate() + 1)
    }


    while (end < endDate) {
        let tempStart = new Date(start)
        let tempEnd = new Date(end)

        tempStart.setUTCHours(parseInt(startTimeParts[0], 10))
        tempStart.setUTCMinutes(parseInt(startTimeParts[1], 10))
        tempStart.setUTCSeconds(parseInt(startTimeParts[2], 10))
        if (peakDays.includes(start.getDay())) {
            tempEnd.setUTCHours(parseInt(endTimeParts[0], 10))
            tempEnd.setUTCMinutes(parseInt(endTimeParts[1], 10))
            tempEnd.setUTCSeconds(parseInt(endTimeParts[2], 10))
        } else {
            if (isPeak === IsPeak.PEAK) {
                tempEnd.setUTCHours(parseInt(startTimeParts[0], 10))
                tempEnd.setUTCMinutes(parseInt(startTimeParts[1], 10))
                tempEnd.setUTCSeconds(parseInt(startTimeParts[2], 10))
            } else {
                tempEnd.setDate(tempStart.getDate() + 1)
                tempEnd.setUTCHours(parseInt(startTimeParts[0], 10))
                tempEnd.setUTCMinutes(parseInt(startTimeParts[1], 10))
                tempEnd.setUTCSeconds(parseInt(startTimeParts[2], 10))
            }
        }

        tempStart.setUTCMilliseconds(0)
        tempEnd.setUTCMilliseconds(0)
        resArr.push({
            startTimestamp: new Date(tempStart),
            endTimestamp: new Date(tempEnd)
        })

        start.setDate(start.getDate() + 1)
        end.setDate(end.getDate() + 1)
    }

    if (frequency === UtilizationTimeFrequency.HOURLY) {
        function divideTimestamps(timestamps: Interval<Date>): Array<Interval<Date>> {
            const pairs: Array<Interval<Date>> = [];

            let {startTimestamp, endTimestamp} = timestamps

            while (startTimestamp < endTimestamp) {
                let startTempTimestamp = new Date(startTimestamp)
                let endTempTimestamp = new Date(startTimestamp.setMinutes(0))
                endTempTimestamp.setHours(endTempTimestamp.getHours() + 1);
                if (endTempTimestamp > endTimestamp) {
                    endTempTimestamp.setTime(endTimestamp.getTime());
                }
                console.log(startTempTimestamp.toISOString(), endTempTimestamp.toISOString());
                pairs.push({startTimestamp: startTempTimestamp, endTimestamp: endTempTimestamp});
                startTimestamp.setTime(endTempTimestamp.getTime());
            }

            return pairs;
        }

        let hourlyResArr: Array<Interval<Date>> = []
        resArr.forEach((item) => {
            hourlyResArr.push(...divideTimestamps(item))
        })

        return hourlyResArr
    }
    return resArr
}


export const splitIntervalsByDays = (intervalsA: Array<Interval<Date>>, intervalsB: Array<Interval<number>>, peakDays: Weekday[], isPeak: IsPeak) => {
    let overlaps = [];

    for (let intervalA of intervalsA) {
        let overlappingSegments = [];
        for (let intervalB of intervalsB) {
            let startA = intervalA['startTimestamp'];
            let endA = intervalA["endTimestamp"];
            let startB = new Date(intervalB['startTimestamp']);
            let endB = new Date(intervalB["endTimestamp"]);

            // Check for overlap
            if (startA < endB && startB < endA) {
                // Overlapping interval found
                let overlapStart = startA > startB ? startA : startB;
                let overlapEnd = endA < endB ? endA : endB;
                overlappingSegments.push([overlapStart, overlapEnd]);
            }
        }
        if (isPeak === IsPeak.PEAK) {
            if (peakDays.includes(new Date(intervalA.startTimestamp).getDay())) {
                overlaps.push({day: intervalA.startTimestamp, interval: intervalA, overlapsWith: overlappingSegments});
            } else {
                overlaps.push({day: intervalA.startTimestamp, interval: intervalA, overlapsWith: []});
            }
        } else {
            overlaps.push({day: intervalA.startTimestamp, interval: intervalA, overlapsWith: overlappingSegments});
        }
    }

    return overlaps;
}

export const calculatePeakMilliseconds = (businessHours: Interval<Date>) => {
    let {startTimestamp, endTimestamp} = businessHours
    return endTimestamp.getTime() - startTimestamp.getTime()
}

export const calculateDailyUtilization = (intervalsByDay: Array<{
    day: Date,
    interval: Interval<Date>,
    overlapsWith: Date[][]
}>) => {
    const utilization = []

    for (const intervals of intervalsByDay) {
        const peakSecondsInDay = calculatePeakMilliseconds(intervals.interval)
        let utilizationInSeconds = 0
        for (const interval of intervals.overlapsWith) {
            utilizationInSeconds += interval[1].getTime() - interval[0].getTime()
        }

        if (peakSecondsInDay === 0) {
            utilization.push({'day': intervals.day.toISOString(), utilization: 0})
        } else {
            utilization.push({
                'day': intervals.day.toISOString(),
                utilization: (utilizationInSeconds * 100) / peakSecondsInDay
            })
        }
    }
    return utilization
}

/**
 * Return smallest start and biggest end of given array of utilization intervals
 * @param data {Array<Interval<any>>} - Array of utilization intervals
 * @returns {[Date, Date]} -
 */
export const getStartEndDates = (data: Array<Interval<any>>) => {

    let startDate = new Date(data[0].startTimestamp)

    let intervalOfMaxEndTimestamp = data.reduce(
        (max: { endTimestamp: number; }, obj: { endTimestamp: number }) =>
            obj.endTimestamp > max.endTimestamp ? obj : max, data[0]);

    let endDate = new Date(new Date(intervalOfMaxEndTimestamp.endTimestamp))

    return [startDate, endDate]
}

export const arraysEqual = (arr1: any[], arr2: any[]) => {
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

export const isSystemLinkError = (error: any): error is SystemLinkError => {
    return Boolean(error?.error?.code) && Boolean(error?.error?.name);
}
