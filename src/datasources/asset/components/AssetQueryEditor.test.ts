import { screen, waitFor } from '@testing-library/react';
import { SystemProperties } from '../../system/types';
import { AssetDataSource } from '../AssetDataSource';
import { setupRenderer } from '../../../test/fixtures';
import { CalibrationForecastDataSource } from '../data-sources/calibration-forecast/CalibrationForecastDataSource';
import { AssetQueryEditor } from './AssetQueryEditor';
import { ListAssetsQuery } from '../types/ListAssets.types';
import { CalibrationForecastQuery } from '../types/CalibrationForecastQuery.types';
import { select } from 'react-select-event';
import { AssetSummaryQuery } from '../types/AssetSummaryQuery.types';
import { AssetQueryType } from '../types/types';
import { ListAssetsDataSource } from '../data-sources/list-assets/ListAssetsDataSource';
import { AssetSummaryDataSource } from '../data-sources/asset-summary/AssetSummaryDataSource';
import { LocationModel } from '../types/ListLocations.types';
import { FeatureTogglesDefaults } from 'core/feature-toggle';

const fakeSystems: SystemProperties[] = [
    {
        id: '1',
        state: 'CONNECTED',
        workspace: '1',
    },
    {
        id: '2',
        state: 'CONNECTED',
        workspace: '2',
    },
];

const fakeLocations: LocationModel[] = [
    {
        id: 'location-1',
        name: 'Location 1'
    },
    {
        id: 'location-2',
        name: 'Location 2'
    }
]

let assetDatasourceOptions = {
    featureToggles: { ...FeatureTogglesDefaults }
}

class FakeAssetsSource extends ListAssetsDataSource {
    querySystems(filter?: string, projection?: string[]): Promise<SystemProperties[]> {
        return Promise.resolve(fakeSystems);
    }

    getLocations(): Promise<LocationModel[]> {
        return Promise.resolve(fakeLocations);
    }
}

class FakeAssetDataSource extends AssetDataSource {
    getCalibrationForecastSource(): CalibrationForecastDataSource {
        return new CalibrationForecastDataSource(this.instanceSettings, this.backendSrv, this.templateSrv);
    }
    getAssetSummarySource(): AssetSummaryDataSource {
        return new AssetSummaryDataSource(this.instanceSettings, this.backendSrv, this.templateSrv);
    }
    getListAssetsSource(): ListAssetsDataSource {
        return new FakeAssetsSource(this.instanceSettings, this.backendSrv, this.templateSrv);
    }
}

const render = setupRenderer(AssetQueryEditor, FakeAssetDataSource, () => assetDatasourceOptions);

beforeEach(() => {
    assetDatasourceOptions = {
        featureToggles: { ...FeatureTogglesDefaults }
    };
});

it('renders Asset list when feature is enabled', async () => {
    localStorage.setItem('assetList', 'true');
    render({ type: AssetQueryType.ListAssets } as ListAssetsQuery);
    const queryType = screen.getAllByRole('combobox')[0];
    await select(queryType, "List Assets", { container: document.body });
    await waitFor(() => expect(screen.getAllByText("List Assets").length).toBe(1));
});

it('renders Asset calibration forecast when feature is enabled', async () => {
    localStorage.setItem('calibrationForecast', 'true');
    render({ type: AssetQueryType.CalibrationForecast } as CalibrationForecastQuery);
    const queryType = screen.getAllByRole('combobox')[0];
    await select(queryType, "Calibration Forecast", { container: document.body });
    await waitFor(() => expect(screen.getAllByText("Calibration Forecast").length).toBe(1))
});

it('renders Asset summary when feature is enabled', async () => {
    localStorage.setItem('assetSummary', 'true');
    render({ type: AssetQueryType.AssetSummary } as AssetSummaryQuery);
    const queryType = screen.getAllByRole('combobox')[0];
    await select(queryType, "Asset Summary", { container: document.body });
    await waitFor(() => expect(screen.getAllByText("Asset Summary").length).toBe(1));
});
