import { screen, waitFor } from '@testing-library/react';
import { setupRenderer } from '../../../test/fixtures';
import { AssetCalibrationForecastGroupByType, AssetCalibrationQuery } from '../types';
import { select } from 'react-select-event';
import { AssetCalibrationDataSource } from '../AssetCalibrationDataSource';
import { AssetCalibrationQueryEditor } from './AssetCalibrationQueryEditor';

class FakeAssetCalibrationDataSource extends AssetCalibrationDataSource {
}

const render = setupRenderer(AssetCalibrationQueryEditor ,FakeAssetCalibrationDataSource);

it('renders with query type calibration forecast', async () => {
  render({} as AssetCalibrationQuery);

  const groupBy = screen.getAllByRole('combobox')[0];
  expect(groupBy).not.toBeNull();
});

it('renders with query type calibration forecast and updates group by time', async () => {
  const [onChange] = render({
    groupBy: [AssetCalibrationForecastGroupByType.Month],
  } as AssetCalibrationQuery);

  // User selects group by day
  const groupBy = screen.getAllByRole('combobox')[0];
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

  // User selects group by month, overrides time
  await select(groupBy, "Month", { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: [AssetCalibrationForecastGroupByType.Month],
      })
    );
  });
});


it('renders with query type calibration forecast and updates group by properties', async () => {
  const [onChange] = render({
    refId: '',
    groupBy: [],
  } as AssetCalibrationQuery);

  // User selects group by location
  const groupBy = screen.getAllByRole('combobox')[0];
  await select(groupBy, "Location", { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: [AssetCalibrationForecastGroupByType.Location],
      })
    );
  });

  // User select group by model
  await select(groupBy, "Model", { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: [AssetCalibrationForecastGroupByType.Location, AssetCalibrationForecastGroupByType.Model],
      })
    );
  });

    // User select group by day
  await select(groupBy, "Day", { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        groupBy: [AssetCalibrationForecastGroupByType.Model, AssetCalibrationForecastGroupByType.Day],
      })
    );
  });
});
