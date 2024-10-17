import { act, screen, waitFor } from '@testing-library/react';
import { setupRenderer } from '../../../../../test/fixtures';
import { select } from 'react-select-event';
import {
  AssetCalibrationPropertyGroupByType,
  AssetCalibrationTimeBasedGroupByType,
  CalibrationForecastQuery,
} from '../../../types/CalibrationForecastQuery.types';
import { CalibrationForecastDataSource } from '../../../data-sources/calibration-forecast/CalibrationForecastDataSource';
import { AssetQueryEditor } from '../../AssetQueryEditor';
import { AssetDataSource } from '../../../AssetDataSource';
import { AssetQueryType } from '../../../types/types';

class FakeAssetCalibrationDataSource extends CalibrationForecastDataSource {}

class FakeAssetDataSource extends AssetDataSource {
  getCalibrationForecastSource(): FakeAssetCalibrationDataSource {
    return new FakeAssetCalibrationDataSource(this.instanceSettings, this.backendSrv, this.templateSrv);
  }
}

describe('CalibrationForecastEditor', () => {
  const render = async (query: CalibrationForecastQuery) => {
    return await act(async () => setupRenderer(AssetQueryEditor, FakeAssetDataSource)(query));
  };

  it('renders with query type calibration forecast', async () => {
    await render({} as CalibrationForecastQuery);

    const groupBy = screen.getAllByRole('combobox')[1];
    expect(groupBy).not.toBeNull();
  });

  it('renders with query type calibration forecast and updates group by time', async () => {
    const [onChange] = await render({
      groupBy: [AssetCalibrationTimeBasedGroupByType.Month],
      queryType: AssetQueryType.CalibrationForecast,
    } as CalibrationForecastQuery);

    // User selects group by day
    const groupBy = screen.getAllByRole('combobox')[1];
    await select(groupBy, "Day", { container: document.body });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ groupBy: [AssetCalibrationTimeBasedGroupByType.Day] })
      );
    });

    // User selects group by location and week, overrides time
    await select(groupBy, "Week", { container: document.body });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          groupBy: [AssetCalibrationTimeBasedGroupByType.Week],
        })
      );
    });

    // User selects group by month, overrides time
    await select(groupBy, "Month", { container: document.body });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          groupBy: [AssetCalibrationTimeBasedGroupByType.Month],
        })
      );
    });
  });

  it('renders with query type calibration forecast and updates group by properties', async () => {
    const [onChange] = await render({
      refId: '',
      groupBy: [],
      queryType: AssetQueryType.CalibrationForecast,
    } as CalibrationForecastQuery);

    // User selects group by location
    const groupBy = screen.getAllByRole('combobox')[1];
    await select(groupBy, "Location", { container: document.body });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          groupBy: [AssetCalibrationPropertyGroupByType.Location],
        })
      );
    });

    // User select group by model
    await select(groupBy, "Model", { container: document.body });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          groupBy: [AssetCalibrationPropertyGroupByType.Location, AssetCalibrationPropertyGroupByType.Model],
        })
      );
    });

    // User select group by day
    await select(groupBy, "Day", { container: document.body });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          groupBy: [AssetCalibrationPropertyGroupByType.Model, AssetCalibrationTimeBasedGroupByType.Day],
        })
      );
    });
  });
});
