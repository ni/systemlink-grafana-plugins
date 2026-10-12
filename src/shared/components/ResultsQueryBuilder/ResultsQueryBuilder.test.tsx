import { SlQueryBuilder } from "core/components/SlQueryBuilder/SlQueryBuilder";
import { QueryBuilderOperations } from "core/query-builder.constants";
import { QueryBuilderOption, Workspace } from "core/types";
import React, { ReactNode } from "react";
import { ResultsQueryBuilder } from "./ResultsQueryBuilder";
import { ResultsQueryBuilderFieldNames } from "./ResultsQueryBuilder.constants";
import { render } from "@testing-library/react";

// Spy that still renders the real element, so the published props can be inspected.
jest.mock('core/components/SlQueryBuilder/SlQueryBuilder', () => {
  const actual = jest.requireActual('core/components/SlQueryBuilder/SlQueryBuilder');
  return { ...actual, SlQueryBuilder: jest.fn(actual.SlQueryBuilder) };
});

const containerClass = 'smart-filter-group-condition-container';
const status = ['PASSED', 'FAILED'];
const partNumber = ['PN1', 'PN2', 'PN3'];

describe('ResultsQueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode

    const workspace = { id: '1', name: 'Selected workspace' } as Workspace;

    function renderElement(workspaces: Workspace[] | null, status: string[], filter: string, globalVariableOptions: QueryBuilderOption[] = [], partNumbers: string[] | null = partNumber) {
      reactNode = React.createElement(ResultsQueryBuilder, { filter, workspaces, status, partNumbers, globalVariableOptions, onChange: jest.fn(), });
      const renderResult = render(reactNode);
      return {
        renderResult,
        conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`)
      };
    }

    it('should render empty query builder', () => {
      const { renderResult, conditionsContainer } = renderElement([], [], '');

      expect(conditionsContainer.length).toBe(1);
      expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    })

    it('should select workspace in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], status, 'Workspace = "1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("Workspace"); //label
      expect(conditionsContainer.item(0)?.textContent).toContain("equals"); //operator
      expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name); //value
    });

    it('should select status in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], status, 'Status.statusType = "PASSED"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("Status"); //label
      expect(conditionsContainer.item(0)?.textContent).toContain("equals"); //operator
      expect(conditionsContainer.item(0)?.textContent).toContain("PASSED"); //value
    });

    it('should select part number in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], status, 'PartNumber = "PN1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("Part number"); //label
      expect(conditionsContainer.item(0)?.textContent).toContain("equals"); //operator
      expect(conditionsContainer.item(0)?.textContent).toContain("PN1"); //value
    });

    it('should select keyword in query builder', () => {
      const { conditionsContainer } = renderElement([], [], 'Keywords.Contains("keyword1")');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("Keyword"); //label
      expect(conditionsContainer.item(0)?.textContent).toContain("equals"); //operator
      expect(conditionsContainer.item(0)?.textContent).toContain("keyword1"); //value
    });

    it('should select global variable option', () => {
      const globalVariableOption = { label: 'Global variable', value: 'global_variable' };
      const { conditionsContainer } = renderElement([workspace], status, 'Workspace = \"global_variable\"', [globalVariableOption]);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("Workspace"); //label
      expect(conditionsContainer.item(0)?.textContent).toContain("equals"); //operator
      expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label); //value
    });

    it('should render multiple conditions in query builder', () => {
      const filter = '(Keywords.Contains("keyword1") && ProgramName = "programName1") || Status.statusType = "FAILED"';
      const { renderResult, conditionsContainer } = renderElement([workspace], status, filter);
      const filterConditions = renderResult.container.getElementsByClassName('smart-filter-group-condition');
      const logicalOperators = renderResult.container.getElementsByClassName('smart-filter-group-operator');
;    
      expect(conditionsContainer?.length).toBe(2);
      expect(filterConditions?.length).toBe(3);
      expect(logicalOperators?.length).toBe(2);

      expect(logicalOperators?.item(0)?.textContent).toContain("And");
      expect(logicalOperators?.item(1)?.textContent).toContain("Or");

      expect(filterConditions.item(0)?.textContent).toContain('keyword1');
      expect(filterConditions.item(1)?.textContent).toContain('programName1');
      expect(filterConditions.item(2)?.textContent).toContain('FAILED');
    });

    [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
      it(`should select user friendly value for updated date`, () => {
        const { conditionsContainer } = renderElement([workspace], status, `UpdatedAt > \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain("Updated"); //label
        expect(conditionsContainer.item(0)?.textContent).toContain("is after"); //operator
        expect(conditionsContainer.item(0)?.textContent).toContain(label); //value
      });
    });

    it('should sanitize fields in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], status, 'Family = "<script>alert(\'Family\')</script>"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.innerHTML).not.toContain('alert(\'Family\')');
    })

    it('should not set workspace field when workspace is null', () => {
      const { conditionsContainer } = renderElement(null, status, 'Workspace = "1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("Property"); //label
      expect(conditionsContainer.item(0)?.textContent).toContain("Operator"); //operator
      expect(conditionsContainer.item(0)?.textContent).toContain("Value"); //value
    })

    it('should not set part number field when part numbers are empty', () => {
      const { conditionsContainer } = renderElement([workspace], status, 'PartNumber = "PN1"', [], null);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("Property"); //label
      expect(conditionsContainer.item(0)?.textContent).toContain("Operator"); //operator
      expect(conditionsContainer.item(0)?.textContent).toContain("Value"); //value
    })

  });

  describe('option label mapping', () => {
    type ResultsQueryBuilderProps = React.ComponentProps<typeof ResultsQueryBuilder>;

    const defaultWorkspace = { id: '2300760d-38c4-48a1-9acb-800260812337', name: 'Default' } as Workspace;
    const globalVariableOption: QueryBuilderOption = { label: 'Global variable', value: 'global_variable' };
    const timedOutStatus = { label: 'Timed out', value: 'Timedout' };
    const workspaceFilter = `${ResultsQueryBuilderFieldNames.WORKSPACE} = "${defaultWorkspace.id}"`;
    const globalVariableFilter = `${ResultsQueryBuilderFieldNames.WORKSPACE} = "${globalVariableOption.value}"`;

    function buildProps(overrides: Partial<ResultsQueryBuilderProps> = {}): ResultsQueryBuilderProps {
      return {
        filter: '',
        workspaces: [defaultWorkspace],
        status,
        partNumbers: partNumber,
        globalVariableOptions: [],
        onChange: jest.fn(),
        ...overrides,
      };
    }

    function getConditionText(container: HTMLElement) {
      const conditions = container.getElementsByClassName(containerClass);
      expect(conditions).toHaveLength(1);

      return conditions.item(0)?.textContent;
    }

    // The Smart element keeps the first customOperations array it receives, so the callbacks of that array are what runs in the browser.
    function buildExpressionWithFirstPublishedOperations(fieldName: string, value: string) {
      const firstPublishedOperations = jest.mocked(SlQueryBuilder).mock.calls
        .map(([props]) => props.customOperations)
        .find(operations => operations?.length);
      const equalsOperation = firstPublishedOperations?.find(operation => operation.name === QueryBuilderOperations.EQUALS.name);
      expect(equalsOperation).toBeDefined();

      return equalsOperation!.expressionBuilderCallback!.call(equalsOperation, fieldName, equalsOperation!.name, value);
    }

    beforeEach(() => {
      jest.mocked(SlQueryBuilder).mockClear();
    });

    describe('nested Status.statusType field', () => {
      it('should display the status label when the label differs from the value', () => {
        const filter = `${ResultsQueryBuilderFieldNames.STATUS} = "${timedOutStatus.value}"`;

        const { container } = render(<ResultsQueryBuilder {...buildProps({ filter, status: [timedOutStatus.label] })} />);

        expect(getConditionText(container)).toContain(timedOutStatus.label);
        expect(getConditionText(container)).not.toContain(timedOutStatus.value);
      });
    });

    describe('when options are provided after the initial render', () => {
      describe('displaying a saved filter', () => {
        it('should display the workspace name when workspaces load after the initial render', () => {
          const { container, rerender } = render(<ResultsQueryBuilder {...buildProps({ filter: workspaceFilter, workspaces: [] })} />);
          expect(getConditionText(container)).toContain(defaultWorkspace.id);

          rerender(<ResultsQueryBuilder {...buildProps({ filter: workspaceFilter })} />);

          expect(getConditionText(container)).toContain(defaultWorkspace.name);
          expect(getConditionText(container)).not.toContain(defaultWorkspace.id);
        });

        it('should display the global variable label when global variable options change after the initial render', () => {
          const { container, rerender } = render(<ResultsQueryBuilder {...buildProps({ filter: globalVariableFilter })} />);
          expect(getConditionText(container)).toContain(globalVariableOption.value);

          rerender(<ResultsQueryBuilder {...buildProps({ filter: globalVariableFilter, globalVariableOptions: [globalVariableOption] })} />);

          expect(getConditionText(container)).toContain(globalVariableOption.label);
          expect(getConditionText(container)).not.toContain(globalVariableOption.value);
        });
      });

      describe('building a filter with the first published operations', () => {
        it('should build the workspace ID from the workspace name when workspaces load after the initial render', () => {
          const { rerender } = render(<ResultsQueryBuilder {...buildProps({ workspaces: [] })} />);
          rerender(<ResultsQueryBuilder {...buildProps()} />);

          const expression = buildExpressionWithFirstPublishedOperations(ResultsQueryBuilderFieldNames.WORKSPACE, defaultWorkspace.name);

          expect(expression).toBe(workspaceFilter);
        });

        it('should build the global variable value from its label when global variable options change after the initial render', () => {
          const { rerender } = render(<ResultsQueryBuilder {...buildProps()} />);
          rerender(<ResultsQueryBuilder {...buildProps({ globalVariableOptions: [globalVariableOption] })} />);

          const expression = buildExpressionWithFirstPublishedOperations(ResultsQueryBuilderFieldNames.WORKSPACE, globalVariableOption.label);

          expect(expression).toBe(globalVariableFilter);
        });
      });
    });

    describe('when a value matches no option', () => {
      it('should display the stored value unchanged', () => {
        const unknownWorkspaceId = 'unknown-workspace-id';
        const filter = `${ResultsQueryBuilderFieldNames.WORKSPACE} = "${unknownWorkspaceId}"`;

        const { container } = render(<ResultsQueryBuilder {...buildProps({ filter })} />);

        expect(getConditionText(container)).toContain(unknownWorkspaceId);
      });

      it('should build the typed value unchanged for a field without options', () => {
        render(<ResultsQueryBuilder {...buildProps()} />);

        const expression = buildExpressionWithFirstPublishedOperations(ResultsQueryBuilderFieldNames.PROGRAM_NAME, 'my program');

        expect(expression).toBe(`${ResultsQueryBuilderFieldNames.PROGRAM_NAME} = "my program"`);
      });
    });
  });
});
