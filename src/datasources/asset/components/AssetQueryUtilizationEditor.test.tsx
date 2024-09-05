import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { SystemMetadata } from "../../system/types";
import { AssetDataSource } from "../AssetDataSource";
import { AssetQueryEditor } from "./AssetQueryEditor";
import { setupRenderer } from "../../../test/fixtures";
import {
  AssetQueryType,
  AssetUtilizationQuery,
  EntityType,
} from '../types';
import userEvent from "@testing-library/user-event";
import { select } from "react-select-event";

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

const workspacesLoaded = () => waitForElementToBeRemoved(screen.getByTestId('Spinner'));

test('renders with query defaults', async () => {
  render({
    queryKind: AssetQueryType.Utilization
  } as AssetUtilizationQuery)
  await workspacesLoaded()

  expect(screen.getByRole('radio', { name: 'Asset' })).toBeChecked();
  expect(screen.getAllByRole('combobox')[1]).toHaveAccessibleDescription('Any workspace');
  expect(screen.getAllByRole('combobox')[2]).toHaveAccessibleDescription('Select systems');

})

it('renders with query different than defaults', async () => {
  render({
    queryKind: AssetQueryType.Utilization,
    entityType: EntityType.System
  } as AssetUtilizationQuery,)
  await workspacesLoaded()

  expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
});

it('updates when user interacts with fields', async () => {
  const [onChange] = render({} as AssetUtilizationQuery);
  await workspacesLoaded()
  const queryType = screen.getAllByRole('combobox')[0];
  expect(queryType).toHaveAccessibleDescription('');

  // User changes query type
  await select(queryType, "Utilization", { container: document.body });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ queryKind: AssetQueryType.Utilization }));
  expect(screen.getByRole('radio', { name: 'Asset' })).toBeChecked();
  await userEvent.click(screen.getByRole('radio', { name: "System" }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ entityType: EntityType.System }));
  expect(screen.queryByText('Asset Identifier')).not.toBeInTheDocument();
});
