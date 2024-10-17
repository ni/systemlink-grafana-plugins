import { screen } from '@testing-library/react';
import { SystemMetadata } from '../../system/types';
import { AssetDataSource } from '../AssetDataSource';
import { setupRenderer } from '../../../test/fixtures';
import { CalibrationForecastDataSource } from '../data-sources/calibration-forecast/CalibrationForecastDataSource';
import { AssetQueryEditor } from './AssetQueryEditor';
import { ListAssetsQuery } from '../types/ListAssets.types';
import { CalibrationForecastQuery } from '../types/CalibrationForecastQuery.types';
import { select } from 'react-select-event';
import { AssetSummaryQuery } from '../types/AssetSummaryQuery.types';
import { AssetFeatureTogglesDefaults, AssetQueryType } from '../types/types';
import { ListAssetsDataSource } from '../data-sources/list-assets/ListAssetsDataSource';
import { AssetSummaryDataSource } from '../data-sources/asset-summary/AssetSummaryDataSource';

const fakeSystems: SystemMetadata[] = [
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

let assetDatasourceOptions = {
    featureToggles: { ...AssetFeatureTogglesDefaults }
}

class FakeAssetsSource extends ListAssetsDataSource {
    querySystems(filter?: string, projection?: string[]): Promise<SystemMetadata[]> {
        return Promise.resolve(fakeSystems);
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
        featureToggles: { ...AssetFeatureTogglesDefaults }
    };
});

it('renders Asset list when feature is enabled', async () => {
    assetDatasourceOptions.featureToggles.assetList = true;
    render({ queryType: AssetQueryType.ListAssets } as ListAssetsQuery);
    const queryType = screen.getAllByRole('combobox')[0];
    await select(queryType, "List Assets", { container: document.body });
    expect(screen.getAllByText("List Assets").length).toBe(1)
});

it('does not render when Asset list feature is not enabled', async () => {
    assetDatasourceOptions.featureToggles.assetList = false;
    render({ queryType: AssetQueryType.ListAssets } as ListAssetsQuery);

    expect(screen.getAllByRole('combobox').length).toBe(1);
});

it('renders Asset calibration forecast when feature is enabled', async () => {
    assetDatasourceOptions.featureToggles.calibrationForecast = true;
    render({ queryType: AssetQueryType.CalibrationForecast } as CalibrationForecastQuery);
    const queryType = screen.getAllByRole('combobox')[0];
    await select(queryType, "Calibration Forecast", { container: document.body });
    expect(screen.getAllByText("Calibration Forecast").length).toBe(1)
});

it('renders Asset summary when feature is enabled', async () => {
    assetDatasourceOptions.featureToggles.assetSummary = true;
    render({ queryType: AssetQueryType.AssetSummary } as AssetSummaryQuery);
    const queryType = screen.getAllByRole('combobox')[0];
    await select(queryType, "Asset Summary", { container: document.body });
    expect(screen.getAllByText("Asset Summary").length).toBe(1)
});
