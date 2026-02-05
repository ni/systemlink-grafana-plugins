import React, { ReactNode } from 'react';
import { SystemsQueryBuilder } from './SystemsQueryBuilder';
import { render } from '@testing-library/react';
import { QueryBuilderOption, Workspace } from 'core/types';
import { SystemFields } from 'datasources/system/SystemsQueryBuilder.constants';

describe('SystemsQueryBuilder', () => {
    describe('useEffects', () => {
        let reactNode: ReactNode;

        const containerClass = 'smart-filter-group-condition-container';
        const workspace = { id: '1', name: 'Default workspace' } as Workspace;

        function renderElement(
            workspaces: Workspace[],
            filter?: string,
            globalVariableOptions: QueryBuilderOption[] = []
        ) {
            reactNode = React.createElement(SystemsQueryBuilder, {
                workspaces,
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
            const { renderResult, conditionsContainer } = renderElement([], '');

            expect(conditionsContainer.length).toBe(1);
            expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
        });

        it('should select workspace in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], `${SystemFields.WORKSPACE.dataField} = "1"`);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
        });

        it('should select connection status with equals operator in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], `${SystemFields.CONNECTION_STATUS.dataField} = "CONNECTED"`);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(SystemFields.CONNECTION_STATUS.label);
            expect(conditionsContainer.item(0)?.textContent).toContain('equals');
            expect(conditionsContainer.item(0)?.textContent).toContain('Connected');
        });

        it('should select connection status with does not equal operator in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], `${SystemFields.CONNECTION_STATUS.dataField} != "DISCONNECTED"`);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(SystemFields.CONNECTION_STATUS.label);
            expect(conditionsContainer.item(0)?.textContent).toContain('does not equal');
            expect(conditionsContainer.item(0)?.textContent).toContain('Disconnected');
        });

        it('should select locked status in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], `${SystemFields.LOCKED_STATUS.dataField} = "true"`);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(SystemFields.LOCKED_STATUS.label);
            expect(conditionsContainer.item(0)?.textContent).toContain('equals');
            expect(conditionsContainer.item(0)?.textContent).toContain('True');
        });

        it('should select os full name in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], `${SystemFields.OS_FULL_NAME.dataField} = "nilrt"`);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(SystemFields.OS_FULL_NAME.label);
            expect(conditionsContainer.item(0)?.textContent).toContain('nilrt');
        });

        it('should select model in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], `${SystemFields.MODEL.dataField} = "NI cRIO-9033"`);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(SystemFields.MODEL.label);
            expect(conditionsContainer.item(0)?.textContent).toContain('NI cRIO-9033');
        });

        it('should select vendor in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], `${SystemFields.VENDOR.dataField} = "National Instruments"`);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(SystemFields.VENDOR.label);
            expect(conditionsContainer.item(0)?.textContent).toContain('National Instruments');
        });

        it('should select scan code in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], `${SystemFields.SCAN_CODE.dataField} = "ABC123DEF456"`);

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(SystemFields.SCAN_CODE.label);
            expect(conditionsContainer.item(0)?.textContent).toContain('ABC123DEF456');
        });

        it('should select global variable option', () => {
            const globalVariableOption = { label: '$system_id', value: '$system_id' };

            const { conditionsContainer } = renderElement(
                [workspace],
                `${SystemFields.SCAN_CODE.dataField} = "$system_id"`,
                [globalVariableOption]
            );

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
        });

        it('should sanitize malicious filter values', () => {
            const { conditionsContainer } = renderElement(
                [workspace],
                'workspace = "<script>alert(\'XSS\')</script>"'
            );

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.innerHTML).not.toContain("alert('XSS')");
        });

        it('should not render query builder until dependencies are loaded', () => {
            reactNode = React.createElement(SystemsQueryBuilder, {
                workspaces: [workspace],
                filter: '',
                globalVariableOptions: [],
                onChange: jest.fn(),
                areDependenciesLoaded: false,
            });
            const { container } = render(reactNode);

            expect(container.querySelector('sl-query-builder')).not.toBeInTheDocument();
        });
    });
});
