import { AssetDataSource } from "../AssetDataSource"
import { setupRenderer } from "test/fixtures"
import { AssetQuery, AssetQueryType, AssetUtilizationQuery } from "../types"
import { screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react"
import { AssetQueryEditor } from "./AssetQueryEditor"
import { select } from "react-select-event";
import { SystemMetadata } from "../../system/types";
import { fakeSystems } from "../test/fakeSystems";

class FakeAssetDataSource extends AssetDataSource {
  querySystems(filter?: string, projection?: string[]): Promise<SystemMetadata[]> {
    return Promise.resolve(fakeSystems);
  }
}

const render = setupRenderer(AssetQueryEditor, FakeAssetDataSource);
const workspacesLoaded = () => waitForElementToBeRemoved(screen.getByTestId('Spinner'));

it('renders with default query', async () => {
  const [onChange] = render({} as AssetQuery);
  expect(screen.getByText('Metadata')).toBeInTheDocument();

  // User changes query type
  const queryType = screen.getAllByRole('combobox')[0];
  await select(queryType, "Utilization", { container: document.body });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: AssetQueryType.Utilization }));
})

it('renders with query and updates', async () => {
  const [onChange] = render({
    type: AssetQueryType.Utilization,
    minionIds: ['1'],
    workspace: '2'
  } as AssetUtilizationQuery);
  await workspacesLoaded();

  // Renders saved query
  expect(screen.getByText('Other workspace')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();

  // User selects different workspace
  await select(screen.getAllByRole('combobox')[1], 'Default workspace', { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ workspace: '1' }));
  });

  // After selecting different workspace minionIds must be empty
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minionIds: [] }));
  });

  // User selects system
  await select(screen.getAllByRole('combobox')[2], '2', { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minionIds: ['2'] }));
  });

  // User adds another system
  await select(screen.getAllByRole('combobox')[2], '$test_var', { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minionIds: ['2', '$test_var'] }));
  });
});
