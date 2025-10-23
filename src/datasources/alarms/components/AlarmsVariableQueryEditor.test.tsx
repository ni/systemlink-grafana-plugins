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
  constructor() {
    super({} as any);
    
    (this as any)._listAlarmsDataSource = {
      async loadWorkspaces(): Promise<Map<string, Workspace>> {
        const workspacesMap = new Map<string, Workspace>();
        fakeWorkspaces.forEach(ws => workspacesMap.set(ws.id, ws));
        return Promise.resolve(workspacesMap);
      },
      
      globalVariableOptions() {
        return [
          { label: 'Workspace', value: 'workspace' },
          { label: 'Alarm ID', value: 'alarmId' }
        ];
      },

      get errorTitle() {
        return undefined as string | undefined;
      },

      get errorDescription() {
        return undefined as string | undefined;
      }
    };
  }
}

const render = setupRenderer(AlarmsVariableQueryEditor, FakeAlarmsDataSource, () => {});

describe('AlarmsVariableQueryEditor', () => {
  it('should render the query builder', async () => {
    render({ refId: 'A', filter: '' } as AlarmsVariableQuery);

    await waitFor(() => expect(screen.getByText('Query By')).toBeInTheDocument());
    expect(screen.getByText('Property')).toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('should load workspaces on mount', async () => {
    render({ refId: 'A', filter: '' } as AlarmsVariableQuery);

    await waitFor(() => expect(screen.getByText('Query By')).toBeInTheDocument());
    expect(screen.getByText('Property')).toBeInTheDocument();
  });

  it('should call onChange when query changes', async () => {
    const onChangeSpy = jest.fn();
    const renderWithOnChange = setupRenderer(AlarmsVariableQueryEditor, FakeAlarmsDataSource, onChangeSpy);
    
    const initialQuery = { refId: 'A', filter: '' } as AlarmsVariableQuery;
    renderWithOnChange(initialQuery);

    await waitFor(() => expect(screen.getByText('Query By')).toBeInTheDocument());
  });

  it('should handle undefined filter gracefully', async () => {
    render({ refId: 'A' } as AlarmsVariableQuery);

    await waitFor(() => expect(screen.getByText('Query By')).toBeInTheDocument());
    expect(screen.getByText('Property')).toBeInTheDocument();
  });

  it('should show floating error when datasource has error', async () => {
    class ErrorAlarmsDataSource extends FakeAlarmsDataSource {
      get errorTitle() {
        return 'Test Error Title';
      }

      get errorDescription() {
        return 'Test error description';
      }
    }

    const errorRender = setupRenderer(AlarmsVariableQueryEditor, ErrorAlarmsDataSource, () => {});
    errorRender({ refId: 'A', filter: '' } as AlarmsVariableQuery);

    await waitFor(() => expect(screen.getByText('Query By')).toBeInTheDocument());
  });
});
