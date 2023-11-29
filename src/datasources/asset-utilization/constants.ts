import {IsNIAsset, IsPeak, UtilizationCategory, UtilizationTimeFrequency, Weekday} from "./types";
import {SelectableValue} from "@grafana/data";

export const isPeakLabels: { [key in IsPeak]: string } = {
    [IsPeak.PEAK]: 'Peak',
    [IsPeak.NONPEAK]: 'Non-Peak',
}

export const peakDayLabels: { [key in Weekday]: string } = {
    [Weekday.Sunday]: 'Sunday',
    [Weekday.Monday]: 'Monday',
    [Weekday.Tuesday]: 'Tuesday',
    [Weekday.Wednesday]: 'Wednesday',
    [Weekday.Thursday]: 'Thursday',
    [Weekday.Friday]: 'Friday',
    [Weekday.Saturday]: 'Saturday',
}

export const utilizationCategoryLabels: { [key in UtilizationCategory]: string } = {
    [UtilizationCategory.ALL]: 'All',
    [UtilizationCategory.TEST]: 'Test',
}

export const utilizationTimeFrequencyLabels: { [key in UtilizationTimeFrequency]: string } = {
    [UtilizationTimeFrequency.DAILY]: 'Daily',
    [UtilizationTimeFrequency.HOURLY]: 'Hourly',
}
export const isPeakOptions: SelectableValue[] = [
    {
        value: IsPeak.PEAK,
        label: isPeakLabels[IsPeak.PEAK],
        description: `Peak`,
    },
    {
        value: IsPeak.NONPEAK,
        label: isPeakLabels[IsPeak.NONPEAK],
        description: `Non-Peak`,
    }
]

export const peakDayOptions: SelectableValue[] = [
    {
        value: Weekday.Sunday,
        label: peakDayLabels[Weekday.Sunday],
        description: `${peakDayLabels[Weekday.Sunday]}`,
    },
    {
        value: Weekday.Monday,
        label: peakDayLabels[Weekday.Monday],
        description: `${peakDayLabels[Weekday.Monday]}`,
    },
    {
        value: Weekday.Tuesday,
        label: peakDayLabels[Weekday.Tuesday],
        description: `${peakDayLabels[Weekday.Tuesday]}`,
    },
    {
        value: Weekday.Wednesday,
        label: peakDayLabels[Weekday.Wednesday],
        description: `${peakDayLabels[Weekday.Wednesday]}`,
    },
    {
        value: Weekday.Thursday,
        label: peakDayLabels[Weekday.Thursday],
        description: `${peakDayLabels[Weekday.Thursday]}`,
    },
    {
        value: Weekday.Friday,
        label: peakDayLabels[Weekday.Friday],
        description: `${peakDayLabels[Weekday.Friday]}`,
    },
    {
        value: Weekday.Saturday,
        label: peakDayLabels[Weekday.Saturday],
        description: `${peakDayLabels[Weekday.Saturday]}`,
    },
]

export const utilizationCategoryOptions: SelectableValue[] = [
    {
        value: UtilizationCategory.ALL,
        label: utilizationCategoryLabels[UtilizationCategory.ALL],
        description: `All`,
    },
    {
        value: UtilizationCategory.TEST,
        label: utilizationCategoryLabels[UtilizationCategory.TEST],
        description: `Test`,
    }
]

export const utilizationTimeFrequencyOptions: SelectableValue[] = [
    {
        value: UtilizationTimeFrequency.DAILY,
        label: utilizationTimeFrequencyLabels[UtilizationTimeFrequency.DAILY],
        description: `${utilizationTimeFrequencyLabels[UtilizationTimeFrequency.DAILY]}`,
    },
    {
        value: UtilizationTimeFrequency.HOURLY,
        label: utilizationTimeFrequencyLabels[UtilizationTimeFrequency.HOURLY],
        description: `${utilizationTimeFrequencyLabels[UtilizationTimeFrequency.HOURLY]}`,
    }
]

export const isNIAssetLabel: { [key in IsNIAsset]: string } = {
    [IsNIAsset.BOTH]: 'All',
    [IsNIAsset.NIASSET]: 'NI',
    [IsNIAsset.NOTNIASSET]: 'Non-NI',
}

export const isNIAssetOptions = [
    {
        value: IsNIAsset.BOTH,
        label: isNIAssetLabel[IsNIAsset.BOTH],
        description: `Select all`,
    },
    {
        value: IsNIAsset.NIASSET,
        label: isNIAssetLabel[IsNIAsset.NIASSET],
        description: `Select NI`,
    },
    {
        value: IsNIAsset.NOTNIASSET,
        label: isNIAssetLabel[IsNIAsset.NOTNIASSET],
        description: `Select not NI`,
    }
]


export const errorCodes: { [key: number]: string } = {
    [-255134]: 'Invalid table ID',
    [-255130]: 'Table does not exist',
};


export const minuteInSeconds = 60 * 1000;
export const hourInSeconds = 60 * minuteInSeconds
export const secondsInDay = 24 * hourInSeconds
