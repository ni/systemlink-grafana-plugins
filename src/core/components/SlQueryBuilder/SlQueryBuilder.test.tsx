import React from 'react';
import { render } from '@testing-library/react';
import { SlQueryBuilder } from './SlQueryBuilder';
import { QueryBuilderCustomOperation, QueryBuilderField } from 'smart-webcomponents-react';

describe('SlQueryBuilder', () => {
  const containerClass = 'smart-filter-group-condition-container';
  const customOperations = [{
    name: '=',
    label: 'Custom operation',
    expressionTemplate: '{0} = "{1}"'
  }];
  const fields = [ { label: 'Field1', dataField: 'field1', filterOperations: ['='] } ];

  function renderElement(
    customOperations: QueryBuilderCustomOperation[] = [],
    fields: QueryBuilderField[] = [],
    messages: any = {},
    value = '',
    onChange = jest.fn()
  ) {
    const reactNode = React.createElement(SlQueryBuilder, { value, customOperations, fields, messages, onChange });
    const renderResult = render(reactNode);

    return {
      renderResult,
      conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
    };
  }

  it('should render empty query builder', () => {
    const { renderResult, conditionsContainer } = renderElement();

    expect(conditionsContainer.length).toBe(1);
    expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
  });

  it('should sanitize fields in query builder', () => {
    const { conditionsContainer } = renderElement(customOperations, fields, {}, 'field1 = "<script>alert(\'Test\')</script>"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.innerHTML).not.toContain('alert(\'Test\')');
  });
});
