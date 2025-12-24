import React, { ReactNode } from 'react';
import { SystemsQueryBuilder } from './SystemsQueryBuilder';
import { render } from '@testing-library/react';
import { QueryBuilderOption, Workspace } from 'core/types';

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
            const { conditionsContainer } = renderElement([workspace], 'workspace = "1"');

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
        });

        it('should select connection status with equals operator in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'connectionStatus = "CONNECTED"');

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('Connection Status');
            expect(conditionsContainer.item(0)?.textContent).toContain('equals');
            expect(conditionsContainer.item(0)?.textContent).toContain('Connected');
        });

        it('should select connection status with does not equal operator in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'connectionStatus != "DISCONNECTED"');

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('Connection Status');
            expect(conditionsContainer.item(0)?.textContent).toContain('does not equal');
            expect(conditionsContainer.item(0)?.textContent).toContain('Disconnected');
        });

        it('should select locked status in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'lockedStatus = "true"');

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('Locked Status');
            expect(conditionsContainer.item(0)?.textContent).toContain('equals');
            expect(conditionsContainer.item(0)?.textContent).toContain('True');
        });

        it('should select os full name in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'osFullName = "nilrt"');

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('Operating System');
            expect(conditionsContainer.item(0)?.textContent).toContain('nilrt');
        });

        it('should select model in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'model = "NI cRIO-9033"');

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('Model');
            expect(conditionsContainer.item(0)?.textContent).toContain('NI cRIO-9033');
        });

        it('should select vendor in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'vendor = "National Instruments"');

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('Vendor');
            expect(conditionsContainer.item(0)?.textContent).toContain('National Instruments');
        });

        it('should select scan code in query builder', () => {
            const { conditionsContainer } = renderElement([workspace], 'scanCode = "ABC123DEF456"');

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('Scan Code');
            expect(conditionsContainer.item(0)?.textContent).toContain('ABC123DEF456');
        });

        it('should select global variable option', () => {
            const globalVariableOption = { label: '$system_id', value: '$system_id' };

            const { conditionsContainer } = renderElement(
                [workspace],
                'scanCode = "$system_id"',
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

        it('should select multi-value equals filter', () => {
            const { conditionsContainer } = renderElement(
                [workspace],
                'scanCode = "{scan1,scan2,scan3}"'
            );

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('Scan Code');
        });

        it('should select multi-value does-not-equal filter', () => {
            const { conditionsContainer } = renderElement(
                [workspace],
                'id != "{system1,system2}"'
            );

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain('does not equal');
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