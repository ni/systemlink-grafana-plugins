import { SelectableValue } from '@grafana/data';
import { Notebook } from './types';

export const timeout = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const formatNotebookOption = (notebook: Notebook): SelectableValue => {
  return {
    label: notebook.name,
    value: notebook.id,
  };
};
