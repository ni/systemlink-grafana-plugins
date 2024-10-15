import React, { ReactNode } from 'react';
import { AssetQueryBuilder } from './AssetQueryBuilder';
import { render } from '@testing-library/react';
import { Workspace } from 'core/types';
import { SystemMetadata } from 'datasources/system/types';

describe('AssetQueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode;

    const containerClass = 'smart-filter-group-condition-container';

    function renderElement(workspaces: Workspace[], systems: SystemMetadata[], filter?: string) {
      reactNode = React.createElement(AssetQueryBuilder, {
        workspaces,
        systems,
        filter,
        onChange: jest.fn(),
        areDependenciesLoaded: true,
      });
      const renderResult = render(reactNode);
      return {
        renderResult,
        conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
      };
    }

    it('should render empty query builder', () => {
      const { renderResult, conditionsContainer } = renderElement([], [], '');
      expect(conditionsContainer.length).toBe(1);
      expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    });

    it('should select workspace in query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemMetadata;
      const { conditionsContainer } = renderElement([workspace], [system], 'Workspace = "1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
    });

    it('should select system in query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemMetadata;

      const { conditionsContainer } = renderElement([workspace], [system], 'Location.MinionId = "1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(system.alias);
    });
  });
});
