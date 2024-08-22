import { screen, waitFor } from '@testing-library/react';
import { setupRenderer } from '../../../test/fixtures';
import { SystemMetadata } from '../../system/types';
import { AssetDataSource } from '../AssetDataSource';
import { AssetQueryEditor } from './AssetQueryEditor';
import { AssetCalibrationForecastGroupByType, AssetCalibrationForecastQuery, AssetQueryType } from '../types';
import { select } from 'react-select-event';

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

class FakeAssetDataSource extends AssetDataSource {
  querySystems(filter?: string, projection?: string[]): Promise<SystemMetadata[]> {
    return Promise.resolve(fakeSystems);
  }
}

const render = setupRenderer(AssetQueryEditor, FakeAssetDataSource);

it('renders with query type calibration forecast', async () => {
  render({ queryKind: AssetQueryType.CalibrationForecast } as AssetCalibrationForecastQuery);

  const groupBy = screen.getAllByRole('combobox')[1];
  expect(groupBy).not.toBeNull();
});

it('renders with query type calibration forecast and updates group by', async () => {
  const [onChange] = render({
    queryKind: AssetQueryType.CalibrationForecast,
    groupBy: [AssetCalibrationForecastGroupByType.Month],
  } as AssetCalibrationForecastQuery);

  // User selects group by day
  const groupBy = screen.getAllByRole('combobox')[1];
  await select(groupBy, "Day", { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ groupBy: [AssetCalibrationForecastGroupByType.Day] })
    );
  });

  // User selects group by location and week, overrides time
  await select(groupBy,"Week", { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: [AssetCalibrationForecastGroupByType.Week],
      })
    );
  });

  // User selects group by location and month, overrides time
  await select(groupBy, "Month", { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: [AssetCalibrationForecastGroupByType.Month],
      })
    );
  });
});
