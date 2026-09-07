import { QBField, QueryBuilderOption, Workspace } from 'core/types';
import React, { ReactNode } from 'react';
import { render, waitFor } from '@testing-library/react';
import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';
import { QueryBuilderOperations } from 'core/query-builder.constants';
import { TIME_OPTIONS } from 'datasources/work-items/constants/WorkItemsQueryBuilder.constants';
import { WorkItemState, WorkItemTypeOptions } from 'datasources/work-items/types';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { User } from 'shared/types/QueryUsers.types';

jest.mock('core/components/SlQueryBuilder/SlQueryBuilder', () => {
  const actual = jest.requireActual('core/components/SlQueryBuilder/SlQueryBuilder');
  return {
    SlQueryBuilder: jest.fn(actual.SlQueryBuilder),
  };
});

import { WorkItemsQueryBuilder } from './WorkItemsQueryBuilder';

describe('WorkItemsQueryBuilder', () => {
  let reactNode: ReactNode;
  const slQueryBuilderMock = SlQueryBuilder as unknown as jest.MockedFunction<typeof SlQueryBuilder>;
  const actualSlQueryBuilder = jest.requireActual('core/components/SlQueryBuilder/SlQueryBuilder').SlQueryBuilder;
  const containerClass = 'smart-filter-group-condition-container';
  const workspace = { id: '1', name: 'Workspace Name' } as Workspace;
  const user: User = {
    id: '1',
    firstName: 'User',
    lastName: '1',
    email: 'user1@123.com',
    properties: {},
    keywords: [],
    created: '',
    updated: '',
    orgId: '',
  };
  const product: ProductPartNumberAndName = { id: '1', partNumber: 'PN-1', name: 'Product 1' };
  const systemAlias: SystemAlias = { id: '1', alias: 'System Alias 1' };
  const globalVariable = { label: '$workItemVariable', value: '$workItemVariable' };

  beforeEach(() => {
    jest.clearAllMocks();
    slQueryBuilderMock.mockImplementation(actualSlQueryBuilder);
  });

  function renderElement(
    filter: string,
    workspaces: Workspace[] | null = [],
    users: User[] | null = [],
    globalVariableOptions: QueryBuilderOption[] = [],
    products: ProductPartNumberAndName[] | null = [],
    systemAliases: SystemAlias[] | null = []
  ) {
    reactNode = React.createElement(WorkItemsQueryBuilder, {
      filter,
      workspaces,
      users,
      products,
      systemAliases,
      globalVariableOptions,
      onChange: jest.fn(),
    });
    const renderResult = render(reactNode);
    return {
      renderResult,
      conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
    };
  }

  async function renderAndGetFields(
    workspaces: Workspace[] | null = [],
    users: User[] | null = [],
    globalVariableOptions: QueryBuilderOption[] = [],
    products: ProductPartNumberAndName[] | null = [],
    systemAliases: SystemAlias[] | null = []
  ) {
    let fields: QBField[] = [];
    slQueryBuilderMock.mockImplementation((props: any) => {
      fields = props.fields ?? [];
      return <></>;
    });

    renderElement('', workspaces, users, globalVariableOptions, products, systemAliases);
    await waitFor(() => expect(fields.length).toBeGreaterThan(0));

    return fields;
  }

  function optionsFor(fields: QBField[], dataField: string) {
    return fields.find(field => field.dataField === dataField)?.lookup?.dataSource as QueryBuilderOption[];
  }

  it('should render empty query builder by default', async () => {
    const { renderResult, conditionsContainer } = renderElement('');

    expect(conditionsContainer.length).toBe(1);
    expect(await renderResult.findByLabelText('Empty condition row')).toBeTruthy();
  });

  describe('property dropdown', () => {
    it('should offer every supported work item property', async () => {
      const fields = await renderAndGetFields();

      expect(fields.map(field => field.label).sort()).toEqual([
        'Asset identifier',
        'Assigned to',
        'Created',
        'Created by',
        'Description',
        'Due date/time',
        'Dut identifier',
        'Earliest start date/time',
        'Estimated duration (days)',
        'Estimated duration (hours)',
        'Fixture identifier',
        'ID',
        'Name',
        'Planned duration (days)',
        'Planned duration (hours)',
        'Planned end date',
        'Planned start date',
        'Product name (Part number)',
        'Properties',
        'Requested by',
        'State',
        'System alias name',
        'Template ID',
        'Test program',
        'Type',
        'Updated',
        'Updated by',
        'Work order ID',
        'Workspace',
      ]);
    });
  });

  describe('operators for each property', () => {
    const equalityOperations = [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name];
    const equalityWithBlankOperations = [
      ...equalityOperations,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ];
    const containsOperations = [QueryBuilderOperations.CONTAINS.name, QueryBuilderOperations.DOES_NOT_CONTAIN.name];
    const textOperations = [...equalityOperations, ...containsOperations];
    const numericOperations = [
      ...equalityOperations,
      QueryBuilderOperations.LESS_THAN.name,
      QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name,
      QueryBuilderOperations.GREATER_THAN.name,
      QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
    ];
    const dateOperations = [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
    ];
    const dateWithBlankOperations = [
      ...dateOperations,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ];
    const listOperations = [
      QueryBuilderOperations.LIST_EQUALS.name,
      QueryBuilderOperations.LIST_DOES_NOT_EQUAL.name,
      QueryBuilderOperations.LIST_IS_EMPTY.name,
      QueryBuilderOperations.LIST_IS_NOT_EMPTY.name,
    ];
    const keyValueOperations = [
      QueryBuilderOperations.KEY_VALUE_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_CONTAINS.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS.name,
    ];

    it.each([
      { dataField: 'id', operations: equalityOperations },
      { dataField: 'name', operations: textOperations },
      { dataField: 'type', operations: equalityOperations },
      { dataField: 'state', operations: equalityOperations },
      { dataField: 'description', operations: containsOperations },
      { dataField: 'testProgram', operations: textOperations },
      { dataField: 'partNumber', operations: equalityOperations },
      { dataField: 'workspace', operations: equalityOperations },
      { dataField: 'assignedTo', operations: equalityWithBlankOperations },
      { dataField: 'requestedBy', operations: equalityWithBlankOperations },
      { dataField: 'createdBy', operations: equalityWithBlankOperations },
      { dataField: 'updatedBy', operations: equalityOperations },
      { dataField: 'parentId', operations: equalityWithBlankOperations },
      { dataField: 'templateId', operations: equalityWithBlankOperations },
      { dataField: 'createdAt', operations: dateOperations },
      { dataField: 'updatedAt', operations: dateOperations },
      { dataField: 'timeline.earliestStartDateTime', operations: dateWithBlankOperations },
      { dataField: 'timeline.dueDateTime', operations: dateWithBlankOperations },
      { dataField: 'schedule.plannedStartDateTime', operations: dateWithBlankOperations },
      { dataField: 'schedule.plannedEndDateTime', operations: dateWithBlankOperations },
      { dataField: 'estimatedDurationInDays', operations: numericOperations },
      { dataField: 'estimatedDurationInHours', operations: numericOperations },
      { dataField: 'plannedDurationInDays', operations: numericOperations },
      { dataField: 'plannedDurationInHours', operations: numericOperations },
      { dataField: 'assets', operations: listOperations },
      { dataField: 'duts', operations: listOperations },
      { dataField: 'fixtures', operations: listOperations },
      { dataField: 'systems', operations: listOperations },
      { dataField: 'properties', operations: keyValueOperations },
    ])('should offer the expected operators for $dataField', async ({ dataField, operations }) => {
      const fields = await renderAndGetFields();

      expect(fields.find(field => field.dataField === dataField)?.filterOperations).toEqual(operations);
    });
  });

  describe('auto population of property options', () => {
    it('should load every work item type as an option for the type property', async () => {
      const fields = await renderAndGetFields();

      expect(optionsFor(fields, 'type').map(option => option.value)).toEqual(Object.values(WorkItemTypeOptions));
    });

    it('should load every work item state as an option for the state property', async () => {
      const fields = await renderAndGetFields();

      expect(optionsFor(fields, 'state').map(option => option.value)).toEqual(Object.values(WorkItemState));
    });

    it('should load workspace options from the workspaces parameter', async () => {
      const fields = await renderAndGetFields([workspace]);

      expect(optionsFor(fields, 'workspace')).toEqual([{ label: 'Workspace Name', value: '1' }]);
    });

    it('should load user options from the users parameter', async () => {
      const fields = await renderAndGetFields([], [user]);

      expect(optionsFor(fields, 'assignedTo')).toEqual([{ label: 'User 1 (user1@123.com)', value: '1' }]);
    });

    it('should load product options from the products parameter', async () => {
      const fields = await renderAndGetFields([], [], [], [product]);

      expect(optionsFor(fields, 'partNumber')).toEqual([{ label: 'Product 1 (PN-1)', value: 'PN-1' }]);
    });

    it('should label a product with its part number when the product has no name', async () => {
      const unnamedProduct: ProductPartNumberAndName = { id: '2', partNumber: 'PN-2', name: '' };

      const fields = await renderAndGetFields([], [], [], [unnamedProduct]);

      expect(optionsFor(fields, 'partNumber')).toEqual([{ label: 'PN-2', value: 'PN-2' }]);
    });

    it('should load system alias options from the systemAliases parameter', async () => {
      const fields = await renderAndGetFields([], [], [], [], [systemAlias]);

      expect(optionsFor(fields, 'systems')).toEqual([{ label: 'System Alias 1', value: '1' }]);
    });

    it('should not build fields until every lookup parameter has loaded', async () => {
      let fields: QBField[] = [];
      slQueryBuilderMock.mockImplementation((props: any) => {
        fields = props.fields ?? [];
        return <></>;
      });

      renderElement('', null, null, [], null, null);

      await waitFor(() => expect(slQueryBuilderMock).toHaveBeenCalled());
      expect(fields).toEqual([]);
    });

    it('should populate options when lookup parameters arrive after the initial render', async () => {
      let fields: QBField[] = [];
      slQueryBuilderMock.mockImplementation((props: any) => {
        fields = props.fields ?? [];
        return <></>;
      });

      const { renderResult } = renderElement('', null, null, [], null, null);
      expect(fields).toEqual([]);

      renderResult.rerender(
        React.createElement(WorkItemsQueryBuilder, {
          filter: '',
          workspaces: [workspace],
          users: [user],
          products: [product],
          systemAliases: [systemAlias],
          globalVariableOptions: [],
          onChange: jest.fn(),
        })
      );

      await waitFor(() => expect(fields.length).toBeGreaterThan(0));
      expect(optionsFor(fields, 'workspace')).toEqual([{ label: 'Workspace Name', value: '1' }]);
      expect(optionsFor(fields, 'assignedTo')).toEqual([{ label: 'User 1 (user1@123.com)', value: '1' }]);
      expect(optionsFor(fields, 'partNumber')).toEqual([{ label: 'Product 1 (PN-1)', value: 'PN-1' }]);
      expect(optionsFor(fields, 'systems')).toEqual([{ label: 'System Alias 1', value: '1' }]);
    });
  });

  describe('global variable options', () => {
    it('should prepend global variable options to lookup properties', async () => {
      const fields = await renderAndGetFields([workspace], [], [globalVariable], [product]);

      expect(optionsFor(fields, 'workspace')).toEqual([globalVariable, { label: 'Workspace Name', value: '1' }]);
      expect(optionsFor(fields, 'partNumber')).toEqual([globalVariable, { label: 'Product 1 (PN-1)', value: 'PN-1' }]);
    });

    it('should show the global variable when the filter selects one', () => {
      const { conditionsContainer } = renderElement(
        'workspace = "$workItemVariable"',
        [workspace],
        [],
        [globalVariable]
      );

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain('$workItemVariable');
    });

    it.each(TIME_OPTIONS)(
      'should show user-friendly label "$label" when updated date filter uses the $label global variable',
      ({ value, label }) => {
        const { conditionsContainer } = renderElement(`updatedAt > "${value}"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(label);
      }
    );
  });

  describe('filter to query builder translation', () => {
    it.each([
      { filter: 'id = "1"', expected: ['ID', 'equals', '1'] },
      { filter: 'name.Contains("test")', expected: ['Name', 'contains', 'test'] },
      { filter: 'type = "WORK_ORDERS"', expected: ['Type', 'equals', 'Work orders'] },
      { filter: 'state = "PENDING_APPROVAL"', expected: ['State', 'equals', 'Pending approval'] },
      { filter: 'properties["key"] = "value"', expected: ['Properties', 'matches', 'key', 'value'] },
      { filter: 'testProgram = "Program 1"', expected: ['Test program', 'equals', 'Program 1'] },
      { filter: 'partNumber = "PN-1"', expected: ['Product name (Part number)', 'equals', 'PN-1'] },
      { filter: 'parentId = "1"', expected: ['Work order ID', 'equals', '1'] },
      { filter: 'string.IsNullOrEmpty(parentId)', expected: ['Work order ID', 'is blank'] },
      { filter: 'templateId = "1"', expected: ['Template ID', 'equals', '1'] },
      { filter: 'timeline.dueDateTime == null || timeline.dueDateTime == ""', expected: ['Due date', 'is blank'] },
      {
        filter: 'timeline.earliestStartDateTime != null && timeline.earliestStartDateTime != ""',
        expected: ['Earliest start date', 'is not blank'],
      },
      { filter: 'estimatedDurationInDays > "1"', expected: ['Estimated duration (days)', 'greater than', '1'] },
      { filter: 'estimatedDurationInHours > "2"', expected: ['Estimated duration (hours)', 'greater than', '2'] },
      { filter: 'plannedDurationInDays < "3"', expected: ['Planned duration (days)', 'less than', '3'] },
      { filter: 'plannedDurationInHours < "4"', expected: ['Planned duration (hours)', 'less than', '4'] },
      { filter: 'systems.Count == 0', expected: ['System alias name', 'is empty'] },
    ])('should show $expected when filter is $filter', ({ filter, expected }) => {
      const { conditionsContainer } = renderElement(filter);

      expect(conditionsContainer.length).toBe(1);
      const conditionText = conditionsContainer.item(0)?.textContent;
      expected.forEach(text => expect(conditionText).toContain(text));
    });

    // These lookups are built from props, so each needs its parameter supplied to resolve the saved value.
    it('should show the workspace name when filter is on workspace', () => {
      const { conditionsContainer } = renderElement('workspace = "1"', [workspace]);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
    });

    it('should show the system alias name when filter checks systems contains a system ID', () => {
      const { conditionsContainer } = renderElement('systems.Contains("1")', [], [], [], [], [systemAlias]);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(systemAlias.alias);
    });

    it('should show the user full name and email when filter is on assignedTo', () => {
      const { conditionsContainer } = renderElement('assignedTo = "1"', [], [user]);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain('Assigned to');
      expect(conditionsContainer.item(0)?.textContent).toContain('User 1 (user1@123.com)');
    });
  });
});
