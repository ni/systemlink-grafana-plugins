import { AssetDataSource } from "../AssetDataSource"
import { setupRenderer } from "test/fixtures"
import { AssetCalibrationForecastGroupByType, AssetCalibrationForecastQuery, AssetMetadataQuery, AssetQuery, AssetQueryLabel, AssetQueryType } from "../types"
import { screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react"
import { AssetQueryEditor } from "./AssetQueryEditor"
import { select } from "react-select-event";
import { SystemMetadata } from "../../system/types";

const fakeSystems: SystemMetadata[] = [
  {
    id: '1',
    state: 'CONNECTED',
    workspace: '1'
  },
  {
    id: '2',
    state: 'CONNECTED',
    workspace: '2'
  },
];

class FakeAssetDataSource extends AssetDataSource {
  querySystems(filter?: string, projection?: string[]): Promise<SystemMetadata[]> {
    return Promise.resolve(fakeSystems);
  }
}

const render = setupRenderer(AssetQueryEditor, FakeAssetDataSource);
const workspacesLoaded = () => waitForElementToBeRemoved(screen.getByTestId('Spinner'));

it('renders with query defaults', async () => {
  render({} as AssetQuery)
  await workspacesLoaded()

  expect(screen.getByRole('radio', { name: AssetQueryLabel.Metadata })).toBeChecked();
  expect(screen.queryByLabelText('Group by')).not.toBeInTheDocument();
  expect(screen.getAllByRole('combobox')[0]).toHaveAccessibleDescription('Any workspace');
  expect(screen.getAllByRole('combobox')[1]).toHaveAccessibleDescription('Select systems');
})

it('renders with initial query and updates when user makes changes', async () => {
  const [onChange] = render({ queryKind: AssetQueryType.Metadata, minionIds: ['1'], workspace: '2' } as AssetMetadataQuery);
  await workspacesLoaded();

  expect(screen.getByRole('radio', { name: AssetQueryLabel.Metadata })).toBeChecked();

  // Renders saved query
  expect(screen.getByText('Other workspace')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();

  // User selects different workspace
  await select(screen.getAllByRole('combobox')[0], 'Default workspace', { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ workspace: '1' }));
  });

  // After selecting different workspace minionIds must be empty
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minionIds: [] }));
  });

  // User selects system
  await select(screen.getAllByRole('combobox')[1], '2', { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minionIds: ['2'] }));
  });

  // User adds another system
  await select(screen.getAllByRole('combobox')[1], '$test_var', { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minionIds: ['2', '$test_var'] }));
  });
});


it('renders with query type calibration forecast and updates when user makes changes', async () => {
  const [onChange] = render({ queryKind: AssetQueryType.CalibrationForecast, groupBy: [AssetCalibrationForecastGroupByType.Month] } as AssetCalibrationForecastQuery);

  // User selects calibration forecast
  expect(screen.getByRole('radio', { name: AssetQueryLabel.CalibrationForecast })).toBeChecked();

  // User selects group by
  await select(screen.getAllByRole('combobox')[0], AssetCalibrationForecastGroupByType.Day , { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ groupBy: [AssetCalibrationForecastGroupByType.Day] }));
  });
});
