import { screen, waitFor } from '@testing-library/react';
import { Workspace } from 'core/types';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsVariableQuery } from '../types/types';
import { setupRenderer } from 'test/fixtures';
import { AlarmsVariableQueryEditor } from './AlarmsVariableQueryEditor';

const fakeWorkspaces: Workspace[] = [
    {
        id: 'ws1',
        name: 'Test Workspace 1',
        default: false,
        enabled: true
    },
    {
        id: 'ws2', 
        name: 'Test Workspace 2',
        default: true,
        enabled: true
    }
];

class FakeAlarmsDataSource extends AlarmsDataSource {
    async loadWorkspaces(): Promise<Map<string, Workspace>> {
        const workspacesMap = new Map<string, Workspace>();
        fakeWorkspaces.forEach(ws => workspacesMap.set(ws.id, ws));
        return Promise.resolve(workspacesMap);
    }

    globalVariableOptions() {
        return [
            { label: 'Workspace', value: 'workspace' },
            { label: 'Alarm ID', value: 'alarmId' }
        ];
    }

    get errorTitle() {
        return undefined as string | undefined;
    }

    get errorDescription() {
        return undefined as string | undefined;
    }
}

const render = setupRenderer(AlarmsVariableQueryEditor, FakeAlarmsDataSource, () => {});

describe('AlarmsVariableQueryEditor', () => {
    it('renders the query builder', async () => {
        render({ refId: 'A', queryBy: '' } as AlarmsVariableQuery);

        await waitFor(() => expect(screen.getByText('Query By')).toBeInTheDocument());
        expect(screen.getByText('Property')).toBeInTheDocument();
        expect(screen.getByText('Operator')).toBeInTheDocument();
        expect(screen.getByText('Value')).toBeInTheDocument();
    });

    it('loads workspaces on mount', async () => {
        const loadWorkspacesSpy = jest.spyOn(FakeAlarmsDataSource.prototype, 'loadWorkspaces');
        
        render({ refId: 'A', queryBy: '' } as AlarmsVariableQuery);

        await waitFor(() => expect(loadWorkspacesSpy).toHaveBeenCalled());
    });

    it('displays error gracefully when workspace loading fails', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        class FailingAlarmsDataSource extends FakeAlarmsDataSource {
            async loadWorkspaces(): Promise<Map<string, Workspace>> {
                throw new Error('Failed to load workspaces');
            }
        }

        const failingRender = setupRenderer(AlarmsVariableQueryEditor, FailingAlarmsDataSource, () => {});
        failingRender({ refId: 'A', queryBy: '' } as AlarmsVariableQuery);

        await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load workspaces:', expect.any(Error)));
        
        consoleErrorSpy.mockRestore();
    });

    it('calls onChange when query changes', async () => {
        const onChangeSpy = jest.fn();
        const renderWithOnChange = setupRenderer(AlarmsVariableQueryEditor, FakeAlarmsDataSource, onChangeSpy);
        
        const initialQuery = { refId: 'A', queryBy: 'workspace = "ws1"' } as AlarmsVariableQuery;
        renderWithOnChange(initialQuery);

        await waitFor(() => expect(screen.getByText('Query By')).toBeInTheDocument());
        
        expect(screen.getByText('Property')).toBeInTheDocument();
    });

    it('handles undefined queryBy gracefully', async () => {
        render({ refId: 'A' } as AlarmsVariableQuery);

        await waitFor(() => expect(screen.getByText('Query By')).toBeInTheDocument());
        expect(screen.getByText('Property')).toBeInTheDocument();
    });

    it('shows floating error when datasource has error', async () => {
        class ErrorAlarmsDataSource extends FakeAlarmsDataSource {
            get errorTitle() {
                return 'Test Error Title';
            }

            get errorDescription() {
                return 'Test error description';
            }
        }

        const errorRender = setupRenderer(AlarmsVariableQueryEditor, ErrorAlarmsDataSource, () => {});
        errorRender({ refId: 'A', queryBy: '' } as AlarmsVariableQuery);

        await waitFor(() => expect(screen.getByText('Query By')).toBeInTheDocument());
    });
});
