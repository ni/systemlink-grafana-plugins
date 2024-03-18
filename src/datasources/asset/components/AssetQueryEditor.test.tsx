import { AssetDataSource } from "../AssetDataSource"
import { setupRenderer } from "test/fixtures"
import {
  AssetQueryType,
  AssetQuery, defaultQuery,
  EntityType,
} from "../types"
import { screen, waitForElementToBeRemoved } from "@testing-library/react"
import { AssetQueryEditor } from "./AssetQueryEditor"
import userEvent from "@testing-library/user-event";

const render = setupRenderer(AssetQueryEditor, AssetDataSource);

const workspacesLoaded = () => waitForElementToBeRemoved(screen.getByTestId('Spinner'));

test('renders with query defaults', async () => {
  render({} as AssetQuery)
  await workspacesLoaded()

  expect(screen.getByRole('radio', { name: 'Metadata' })).toBeChecked();
})

it('updates when user interacts with fields', async () => {
  const [onChange] = render(defaultQuery as AssetQuery);
  await workspacesLoaded()

  expect(screen.getByRole('radio', { name: 'Metadata' })).toBeChecked();

  // User changes query type
  await userEvent.click(screen.getByRole('radio', { name: "Utilization" }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ assetQueryType: AssetQueryType.UTILIZATION }));
  expect(screen.getByRole('radio', { name: 'Asset' })).toBeChecked();
  await userEvent.click(screen.getByRole('radio', { name: "System" }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ entityType: EntityType.SYSTEM }));
  expect(screen.queryByText('Asset Identifier')).not.toBeInTheDocument();
});
