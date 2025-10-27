import { DataSourceJsonData } from "@grafana/data";

interface FeatureToggle {
  name: string;
  enabledByDefault: boolean;
  description?: string;
}

export interface FeatureToggleDataSourceOptions extends DataSourceJsonData {
  featureToggles: { [key: string]: boolean };
}

export enum FeatureToggleNames {
  assetList = 'assetList',
  calibrationForecast = 'calibrationForecast',
  assetSummary = 'assetSummary',
  locations = 'locations'
}

export const FeatureTogglesDefaults: Record<FeatureToggleNames, FeatureToggle> = {
  [FeatureToggleNames.assetList]: {
    name: 'assetList',
    enabledByDefault: true,
    description: 'Enables the Asset List query type.'
  },
  [FeatureToggleNames.calibrationForecast]: {
    name: 'calibrationForecast',
    enabledByDefault: true,
    description: 'Enables the Calibration Forecast query type.'
  },
  [FeatureToggleNames.assetSummary]: {
    name: 'assetSummary',
    enabledByDefault: true,
    description: 'Enables the Asset Summary query type.'
  },
  [FeatureToggleNames.locations]: {
    name: 'locations',
    enabledByDefault: false,
    description: 'Enables location support in Asset queries.'
  }
};

export function getFeatureFlagValue(options:  FeatureToggleDataSourceOptions, flagName: FeatureToggleNames): boolean {
  // Check if the feature flag is set in the datasource options.
  const optionValue = options?.featureToggles && options?.featureToggles[flagName];
  if (optionValue !== undefined && optionValue) {
    return optionValue;
  }

  // Check if the feature flag is set in local storage.
  const localValue = localStorage.getItem(`${flagName}`);
  if (localValue !== null) {
    return localValue === 'true';
  }

  // If not set in options or local storage, use the default value and set it to local storage.
  localStorage.setItem(
      FeatureTogglesDefaults[flagName].name,
      FeatureTogglesDefaults[flagName].enabledByDefault.toString()
  );
  return FeatureTogglesDefaults[flagName].enabledByDefault;
}
