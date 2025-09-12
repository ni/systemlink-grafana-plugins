import React, { ReactNode } from 'react';
import { AssetQueryBuilder } from './AssetQueryBuilder';
import { render } from '@testing-library/react';
import { QueryBuilderOption, Workspace } from 'core/types';
import { SystemProperties } from 'datasources/system/types';
import { LocationModel } from 'datasources/asset/types/ListLocations.types';

describe('AssetQueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode;

    const containerClass = 'smart-filter-group-condition-container';

    function renderElement(workspaces: Workspace[], systems: SystemProperties[], locations: LocationModel[], filter?: string, globalVariableOptions: QueryBuilderOption[] = []) {
      reactNode = React.createElement(AssetQueryBuilder, {
        workspaces,
        systems,
        locations,
        filter,
        globalVariableOptions,
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
      const { renderResult, conditionsContainer } = renderElement([], [], [], '');
      expect(conditionsContainer.length).toBe(1);
      expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    });

    it('should select workspace in query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemProperties;
      const { conditionsContainer } = renderElement([workspace], [system], [], 'Workspace = "1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
    });

    it('should select system in query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemProperties;

      const { conditionsContainer } = renderElement([workspace], [system], [], 'Location = "1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(system.alias);
    });

    it('should select physical location in query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemProperties;
      const location = { id: 'location-1', name: 'Location 1' } as LocationModel;

      const { conditionsContainer } = renderElement([workspace], [system], [location], 'Location = "location-1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(location.name);
    });

    it('should select global variable option', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemProperties;
      const globalVariableOption = { label: 'Global variable', value: 'global_variable' };

      const { conditionsContainer } = renderElement([workspace], [system], [], 'AssetType = \"global_variable\"', [globalVariableOption]);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
    });

    [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
      it(`should select user friendly value for calibration due date`, () => {
        const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
        const system = { id: '1', alias: 'Selected system' } as SystemProperties;

        const { conditionsContainer } = renderElement([workspace], [system], [], `ExternalCalibration.NextRecommendedDate > \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(label);
      });
    });

    it('should select a sanitized Workspace in query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemProperties;
      const { conditionsContainer } = renderElement([workspace], [system], [], 'Workspace = "<script>alert(\'Workspace\')</script>"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.innerHTML).not.toContain('alert(\'Workspace\')');
    })
  });
});
