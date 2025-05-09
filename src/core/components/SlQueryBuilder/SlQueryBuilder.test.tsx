import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { SlQueryBuilder } from './SlQueryBuilder';
import { QueryBuilderCustomOperation, QueryBuilderField } from 'smart-webcomponents-react';

describe('SlQueryBuilder', () => {
  const containerClass = 'smart-filter-group-condition-container';

  function renderElement (
    customOperations: QueryBuilderCustomOperation[] = [],
    fields: QueryBuilderField[] = [],
    messages: any = {},
    filter = '',
    onChange = jest.fn()
  ) {
    const reactNode = React.createElement(SlQueryBuilder, { filter, customOperations, fields, messages, onChange });
    const renderResult = render(reactNode);

    return {
      renderResult,
      conditionsContainer: renderResult.container.getElementsByClassName(`${ containerClass }`),
    };
  }

  it('should render empty query builder', () => {
    const { renderResult, conditionsContainer } = renderElement();

    expect(conditionsContainer.length).toBe(1);
    expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
  });

  it('should render QueryBuilder with custom operations and fields', () => {
    const customOperations = [{
      name: '=',
      label: 'Custom operation',
      expressionTemplate: '{0} = "{1}"'
    }];
    const fields = [ { label: 'Field1', dataField: 'field1', filterOperations: ['='] } ];
    const value = 'field1 = "value1"';

    const { conditionsContainer } = renderElement(customOperations, fields, {}, value);

    expect(conditionsContainer.length).toBe(1);

    expect(conditionsContainer.item(0)?.textContent).toContain('Field1');
    expect(conditionsContainer.item(0)?.textContent).toContain('Custom operation');
    expect(conditionsContainer.item(0)?.textContent).toContain('value1');
  });

  it('should sanitize fields in query builder', () => {
    const { conditionsContainer } = renderElement([], [], {}, 'field1 = "<script>alert(\'Test\')</script>"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.innerHTML).not.toContain('alert(\'Test\')');
  });

  it('should call onChange when the filter changes', () => {
    const onChange = jest.fn();
    const { renderResult } = renderElement([], [], {}, '', onChange);

    const queryBuilder = renderResult.container.querySelector('.smart-query-builder');
    fireEvent.change(queryBuilder!, { target: { value: 'field1 = "value1"' } });

    expect(onChange).toHaveBeenCalled();
  });
});
