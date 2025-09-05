import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { AlarmsQueryBuilder } from './AlarmsQueryBuilder';
import { QueryBuilderOption } from 'core/types';

describe('AlarmsQueryBuilder', () => {
  let reactNode: ReactNode;
  const containerClass = 'smart-filter-group-condition-container';

  function renderElement(filter: string, globalVariableOptions: QueryBuilderOption[] = []) {
    reactNode = React.createElement(AlarmsQueryBuilder, { filter, globalVariableOptions, onChange: jest.fn() });
    const renderResult = render(reactNode);
    return {
      renderResult,
      conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
    };
  }

  it('should render empty query builder', () => {
    const { renderResult, conditionsContainer } = renderElement('');

    expect(conditionsContainer.length).toBe(1);
    expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
  });

  [['true', 'True'], ['false', 'False']].forEach(([value, label]) => {

    it(`should select ${label} for acknowledged in query builder`, () => {
        const { conditionsContainer } = renderElement(`acknowledged = \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(label);
    });
    it(`should select ${label} for active in query builder`, () => {
        const { conditionsContainer } = renderElement(`active = \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(label);
    });

    it(`should select ${label} for clear in query builder`, () => {
        const { conditionsContainer } = renderElement(`clear = \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(label);
    });
  });

  [[-1, 'Clear'], [1, 'Low (1)'], [2, 'Moderate (2)'], [3, 'High (3)'], [4, 'Critical (4)']].forEach(([value, label]) => {
    it(`should select ${label} for current severity in query builder`, () => {
        const { conditionsContainer } = renderElement(`currentSeverityLevel = "${value}"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(label);
    });

    it(`should select ${label} for highest severity in query builder`, () => {
        const { conditionsContainer } = renderElement(`highestSeverityLevel = "${value}"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(label);
    });
  });

  it('should select global variable option', () => {
    const globalVariableOption = { label: 'Global variable', value: '$global_variable' };
    const { conditionsContainer } = renderElement('currentSeverityLevel = \"$global_variable\"', [globalVariableOption]);

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
  });
});
