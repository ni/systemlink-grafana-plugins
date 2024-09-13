import { setupRenderer } from "../../../test/fixtures";
import { AssetDataSource } from "../AssetDataSource";
import { screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import { select } from 'react-select-event';
import { SystemMetadata } from "../../system/types";
import { AssetQueryType } from "../types";
import { AssetVariableQueryEditor } from "./AssetVariableQueryEditor";
import { fakeSystems } from "../test/fakeSystems";

class FakeAssetDataSource extends AssetDataSource {
  querySystems(filter?: string, projection?: string[]): Promise<SystemMetadata[]> {
    return Promise.resolve(fakeSystems);
  }
}

const render = setupRenderer(AssetVariableQueryEditor, FakeAssetDataSource);
const workspacesLoaded = () => waitForElementToBeRemoved(screen.getByTestId('Spinner'));


test('default render', async () => {
  render({ minionIds: [], workspace: "", type: AssetQueryType.Metadata });
  await workspacesLoaded();

  expect(screen.getAllByRole('combobox')[0]).toHaveAccessibleDescription('Any workspace');
  expect(screen.getAllByRole('combobox')[1]).toHaveAccessibleDescription('Select system');
})

test('renders with initial query and updates when user makes changes', async () => {
  const [onChange] = render({ type: AssetQueryType.Metadata, workspace: '2', minionIds: ['1'] });
  await workspacesLoaded();

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
})
