import { AssetDataSource } from "../AssetDataSource"
import { setupRenderer } from "test/fixtures"
import { AssetQuery } from "../types"
import { screen, waitForElementToBeRemoved } from "@testing-library/react"
import { AssetQueryEditor } from "./AssetQueryEditor"
import { selectors } from "../../../test/selectors";

const render = setupRenderer(AssetQueryEditor, AssetDataSource);

const workspacesLoaded = () => waitForElementToBeRemoved(screen.getByTestId('Spinner'));

test('renders with query defaults', async () => {
  render({} as AssetQuery)
  await workspacesLoaded()

  expect(screen.getByTestId(selectors.components.assetPlugin.workspace)).toHaveTextContent('Any workspace');
  expect(screen.getByTestId(selectors.components.assetPlugin.system)).toHaveTextContent('Select systems');
})
