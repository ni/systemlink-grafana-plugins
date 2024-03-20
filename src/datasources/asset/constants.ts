import {
  AssetQueryType,
  EntityType,
  IsNIAsset,
  IsPeak,
  PolicyOption,
  TimeFrequency,
  UtilizationCategory,
  Weekday
} from "./types";
import { SelectableValue } from "@grafana/data";

export const assetQueryTypeLabels: { [key in AssetQueryType]: string } = {
  [AssetQueryType.METADATA]: 'Metadata',
  [AssetQueryType.UTILIZATION]: 'Utilization',
}

export const entityTypeLabels: { [key in EntityType]: string } = {
  [EntityType.ASSET]: 'Asset',
  [EntityType.SYSTEM]: 'System',
}

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

export const timeFrequencyLabels: { [key in TimeFrequency]: string } = {
  [TimeFrequency.DAILY]: 'Daily',
  [TimeFrequency.HOURLY]: 'Hourly',
}

export const assetQueryTypeOptions: SelectableValue[] = [
  {
    value: AssetQueryType.METADATA,
    label: assetQueryTypeLabels[AssetQueryType.METADATA],
    description: assetQueryTypeLabels[AssetQueryType.METADATA],
  },
  {
    value: AssetQueryType.UTILIZATION,
    label: assetQueryTypeLabels[AssetQueryType.UTILIZATION],
    description: assetQueryTypeLabels[AssetQueryType.UTILIZATION],
  }
]

export const entityTypeOptions: SelectableValue[] = [
  {
    value: EntityType.ASSET,
    label: entityTypeLabels[EntityType.ASSET],
    description: entityTypeLabels[EntityType.ASSET],
  },
  {
    value: EntityType.SYSTEM,
    label: entityTypeLabels[EntityType.SYSTEM],
    description: entityTypeLabels[EntityType.SYSTEM],
  }
]

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

export const policyOptions: SelectableValue[] = [
  {
    value: PolicyOption.DEFAULT,
    label: "Default",
  },
  {
    value: PolicyOption.ALL,
    label: "All day",
  },
  {
    value: PolicyOption.CUSTOM,
    label: "Custom",
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

export const timeFrequencyOptions: SelectableValue[] = [
  {
    value: TimeFrequency.DAILY,
    label: timeFrequencyLabels[TimeFrequency.DAILY],
    description: `${timeFrequencyLabels[TimeFrequency.DAILY]}`,
  },
  {
    value: TimeFrequency.HOURLY,
    label: timeFrequencyLabels[TimeFrequency.HOURLY],
    description: `${timeFrequencyLabels[TimeFrequency.HOURLY]}`,
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

export const minuteInSeconds = 60 * 1000;
export const hourInSeconds = 60 * minuteInSeconds
export const secondsInDay = 24 * hourInSeconds
