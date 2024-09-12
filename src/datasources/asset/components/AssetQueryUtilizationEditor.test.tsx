import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { SystemMetadata } from "../../system/types";
import { AssetDataSource } from "../AssetDataSource";
import { setupRenderer } from "../../../test/fixtures";
import { AssetQueryType, AssetUtilizationQuery, EntityType, } from '../types';
import userEvent from "@testing-library/user-event";
import { QueryUtilizationEditor } from "./AssetQueryUtilizationEditor";
import { fakeSystems } from "../constants";

const workspacesLoaded = () => waitForElementToBeRemoved(screen.getByTestId('Spinner'));
class FakeAssetDataSource extends AssetDataSource {
  querySystems(filter?: string, projection?: string[]): Promise<SystemMetadata[]> {
    return Promise.resolve(fakeSystems);
  }
}
const render = setupRenderer(QueryUtilizationEditor, FakeAssetDataSource);

it('renders with query defaults', async () => {
  render({
    queryKind: AssetQueryType.Utilization
  } as AssetUtilizationQuery)
  await workspacesLoaded()

  expect(screen.getByRole('radio', { name: 'Asset' })).toBeChecked();
  expect(screen.getAllByRole('combobox')[0]).toHaveAccessibleDescription('Any workspace');
  expect(screen.getAllByRole('combobox')[1]).toHaveAccessibleDescription('Select systems');
})

it('renders with query different than defaults', async () => {
  render({
    queryKind: AssetQueryType.Utilization,
    entityType: EntityType.System,
    minionIds: ['1']
  } as AssetUtilizationQuery,)
  await workspacesLoaded()

  expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
  expect(screen.getByText('1')).toBeInTheDocument();
});

it('updates when user interacts with fields', async () => {
  render({
    queryKind: AssetQueryType.Utilization,
    entityType: EntityType.Asset
  } as AssetUtilizationQuery,)
  await workspacesLoaded()

  expect(screen.getByRole('radio', { name: 'Asset' })).toBeChecked();
  await userEvent.click(screen.getByRole('radio', { name: 'System' }));
  expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
});
