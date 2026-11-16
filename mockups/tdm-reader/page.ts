import { Table } from '@ni/nimble-components/dist/esm/table';
import '@ni/nimble-components/dist/esm/table-column/text';
import '@ni/nimble-components/dist/esm/theme-provider';
import '@ni/nimble-components/dist/esm/menu';
import '@ni/nimble-components/dist/esm/menu-item';
import '@ni/nimble-components/dist/esm/icons/list';
import '@ni/nimble-components/dist/esm/icons/list-tree';
import '@ni/nimble-components/dist/esm/icons/magnifying-glass';
import '../../src/core/components/SlQueryBuilder/SlQueryBuilder.scss';
import { getChannelRecords } from '../../src/datasources/tdm-reader/mock-data';
import { getFileFilterState, retainChannelSelection } from '../../src/datasources/tdm-reader/query-utils';
import {
  buildSelectorRows, filterSelectorRows, getSelectedChannelCount, MAX_CHANNEL_SELECTIONS,
  SelectorRow, updateChannelSelection,
} from '../../src/datasources/tdm-reader/channel-selector-utils';
import { ChannelRecord, SAMPLE_INDEX_AXIS_ID, TIMESTAMP_AXIS_ID, TdmFilter } from '../../src/datasources/tdm-reader/types';
import type { TableActionMenuToggleEventDetail, TableRowSelectionEventDetail } from '@ni/nimble-components/dist/esm/table/types';

require('smart-webcomponents-react/source/modules/smart.querybuilder.js');

interface QueryBuilderElement extends HTMLElement {
  fields: Array<{ label: string; dataField: string; dataType: string; filterOperations: string[] }>;
  customOperations: Array<{ name: string; label: string; expressionTemplate: string; hideValue?: boolean }>;
  value: TdmFilter;
  messages: Record<string, Record<string, string>>;
}

function element<T extends HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) {
    throw new Error(`Missing mockup element: ${id}`);
  }
  return result as T;
}

const builder = element<QueryBuilderElement>('query');
const table = element<Table<SelectorRow>>('channels');
if (!(table instanceof Table)) {
  throw new Error('The Nimble channel table could not be initialized.');
}
const search = element<HTMLInputElement>('search');
const queryError = element('query-error');
const tableError = element('table-error');
const alert = element('limit-alert');
const dialog = element<HTMLDialogElement>('properties-dialog');
let channels: ChannelRecord[] = [];
let selectedIds: string[] = [];
let merged = false;
let syncing = false;
let menuOpen = false;
let menuRowId: string | undefined;
let dismissedInfo = false;
let dismissedWarning = false;
let previousCount = 0;
let previousRows: string[] = [];
let model = buildSelectorRows(channels, merged);
let updateQueue = Promise.resolve();
let revision = 0;

type AxisRow = { id: string; name: string; fileName: string; groupName: string };
const axisDialog = element<HTMLDialogElement>('x-axis-dialog');
const axisTable = element<Table<AxisRow>>('x-axis-table');
const axisValue = element<HTMLInputElement>('x-axis-value');
const axisSearch = element<HTMLInputElement>('x-axis-search');
const showAllChannels = element<HTMLInputElement>('show-all-channels');
const axisError = element('x-axis-error');
const confirmAxis = element<HTMLButtonElement>('confirm-x-axis');
let axisId = SAMPLE_INDEX_AXIS_ID;
let draftAxisId = axisId;
let axisSyncing = false;
let axisRevision = 0;
let axisQueue = Promise.resolve();

function axisOptions(): AxisRow[] {
  return [
    { id: SAMPLE_INDEX_AXIS_ID, name: 'Sample Index', fileName: '', groupName: '' },
    { id: TIMESTAMP_AXIS_ID, name: 'Timestamp', fileName: '', groupName: '' },
    ...channels.map(({ id, name, fileName, groupName }) => ({ id, name, fileName, groupName })),
  ];
}

function refreshAxis(): void {
  const options = axisOptions();
  if (!options.some(option => option.id === axisId)) {
    axisId = SAMPLE_INDEX_AXIS_ID;
  }
  axisValue.value = options.find(option => option.id === axisId)!.name;
  if (!axisDialog.open) {
    return;
  }
  if (!options.some(option => option.id === draftAxisId)) {
    draftAxisId = SAMPLE_INDEX_AXIS_ID;
  }
  const term = axisSearch.value.trim().toLowerCase();
  const records = options.filter(option =>
    (option.id === SAMPLE_INDEX_AXIS_ID || option.id === TIMESTAMP_AXIS_ID ||
      showAllChannels.checked || selectedIds.includes(option.id)) &&
    `${option.name} ${option.fileName} ${option.groupName}`.toLowerCase().includes(term));
  const selected = records.some(option => option.id === draftAxisId) ? [draftAxisId] : [];
  const currentRevision = ++axisRevision;
  axisSyncing = true;
  confirmAxis.disabled = true;
  axisQueue = axisQueue.then(async () => {
    try {
      if (currentRevision !== axisRevision) {
        return;
      }
      await axisTable.setData(records);
      await axisTable.setSelectedRecordIds(selected);
      if (!axisTable.checkValidity()) {
        throw new Error('The x-axis table configuration is invalid.');
      }
      if (currentRevision === axisRevision) {
        axisError.hidden = true;
        confirmAxis.disabled = false;
      }
    } catch (error) {
      axisError.textContent = error instanceof Error ? error.message : String(error);
      axisError.hidden = false;
    } finally {
      if (currentRevision === axisRevision) {
        axisSyncing = false;
      }
    }
  });
}

element('edit-x-axis').addEventListener('click', () => {
  draftAxisId = axisId;
  axisSearch.value = '';
  showAllChannels.checked = false;
  axisError.hidden = true;
  axisDialog.showModal();
  axisValue.setAttribute('aria-expanded', 'true');
  refreshAxis();
  axisSearch.focus();
});
axisTable.addEventListener('selection-change', event => {
  if (axisSyncing || !axisDialog.open) {
    return;
  }
  const ids = (event as CustomEvent<TableRowSelectionEventDetail>).detail.selectedRecordIds;
  if (ids.length === 1 && axisOptions().some(option => option.id === ids[0])) {
    draftAxisId = ids[0];
  }
  refreshAxis();
});
axisSearch.addEventListener('input', refreshAxis);
showAllChannels.addEventListener('change', refreshAxis);
element('cancel-x-axis').addEventListener('click', () => axisDialog.close());
confirmAxis.addEventListener('click', () => {
  if (confirmAxis.disabled) {
    return;
  }
  axisId = draftAxisId;
  axisDialog.close();
  refreshAxis();
});
axisDialog.addEventListener('close', () => {
  axisValue.setAttribute('aria-expanded', 'false');
  element('edit-x-axis').focus();
});

function updateSummary(): void {
  const count = getSelectedChannelCount(selectedIds);
  if (count !== previousCount) {
    dismissedWarning = false;
    if (count < MAX_CHANNEL_SELECTIONS) {
      dismissedInfo = false;
    }
    previousCount = count;
  }
  element('count').textContent = `X  ${count} ${count === 1 ? 'channel' : 'channels'} selected`;
  element('clear-selection').hidden = selectedIds.length === 0;
  const exceeded = count > MAX_CHANNEL_SELECTIONS;
  alert.hidden = exceeded ? dismissedWarning : count !== MAX_CHANNEL_SELECTIONS || dismissedInfo;
  alert.classList.toggle('info', !exceeded);
  element('limit-title').textContent = exceeded ? 'Too many channels selected' : 'Channel limit reached';
  element('limit-message').textContent = exceeded
    ? `More than ${MAX_CHANNEL_SELECTIONS} channels selected. Reduce the selection to ${MAX_CHANNEL_SELECTIONS} or fewer to run the query.`
    : `Maximum of ${MAX_CHANNEL_SELECTIONS} channel selections reached.`;
}

function refresh(): void {
  const currentRevision = ++revision;
  syncing = true;
  model = buildSelectorRows(channels, merged);
  const records = filterSelectorRows(model.rows, search.value);
  const snapshot = model;
  const selection = new Set(selectedIds);
  const checked = records.filter(row => snapshot.channelIdsByRow.get(row.id)?.every(id => selection.has(id))).map(row => row.id);
  const state = getFileFilterState(builder.value);
  const message = state.empty ? 'Add a File ID or File Name condition to see mock files and channels.'
    : channels.length === 0 ? 'No mock files match this filter.'
      : records.length === 0 ? 'No channels match your search.' : '';
  element('empty-message').textContent = message;
  element('empty-message').hidden = !message || Boolean(state.error);
  element('nested').setAttribute('aria-pressed', String(!merged));
  element('merged').setAttribute('aria-pressed', String(merged));
  element('clear-search').hidden = !search.value;
  element('name-column').setAttribute('action-menu-slot', merged ? '' : 'properties');
  updateSummary();
  refreshAxis();
  updateQueue = updateQueue.then(async () => {
    try {
      if (currentRevision !== revision) {
        return;
      }
      await table.setData(records);
      await table.setSelectedRecordIds(checked);
      if (!table.checkValidity()) {
        throw new Error('The channel table configuration is invalid.');
      }
      previousRows = checked;
      tableError.hidden = true;
    } catch (error) {
      tableError.textContent = error instanceof Error ? error.message : String(error);
      tableError.hidden = false;
    } finally {
      if (currentRevision === revision) {
        syncing = false;
      }
    }
  });
}

function updateQuery(): void {
  const state = getFileFilterState(builder.value);
  queryError.hidden = !state.error;
  queryError.textContent = state.error ?? '';
  channels = getChannelRecords(state.files);
  selectedIds = retainChannelSelection(selectedIds, channels.map(channel => channel.id));
  refresh();
}

builder.messages = { ...builder.messages, en: { ...builder.messages.en, queryLabel: '' } };
builder.fields = [
  { label: 'File ID', dataField: 'fileId', dataType: 'string', filterOperations: ['='] },
  { label: 'File Name', dataField: 'fileName', dataType: 'string', filterOperations: ['=', '<>'] },
];
builder.customOperations = [
  { name: '=', label: 'Equals', expressionTemplate: '{0} = {1}' },
  { name: '<>', label: 'Does not equal', expressionTemplate: '{0} <> {1}' },
];
builder.value = [];
builder.addEventListener('change', updateQuery);
table.addEventListener('selection-change', event => {
  if (syncing || menuOpen) {
    return;
  }
  const detail = (event as CustomEvent<TableRowSelectionEventDetail>).detail;
  selectedIds = updateChannelSelection(selectedIds, previousRows, detail.selectedRecordIds, model);
  refresh();
});
table.addEventListener('action-menu-beforetoggle', event => {
  const detail = (event as CustomEvent<TableActionMenuToggleEventDetail>).detail;
  menuOpen = detail.newState;
  if (detail.newState) {
    menuRowId = detail.operatingRecordId;
  }
});
table.addEventListener('action-menu-toggle', event => {
  menuOpen = (event as CustomEvent<TableActionMenuToggleEventDetail>).detail.newState;
});
search.addEventListener('input', refresh);
element('clear-search').addEventListener('click', () => { search.value = ''; refresh(); });
element('clear-selection').addEventListener('click', () => { selectedIds = []; refresh(); });
element('nested').addEventListener('click', () => { merged = false; refresh(); });
element('merged').addEventListener('click', () => { merged = true; refresh(); });
element('channels-section').addEventListener('toggle', () => refresh());
element('dismiss-limit').addEventListener('click', () => {
  dismissedInfo = true;
  dismissedWarning = true;
  updateSummary();
});
element('properties').addEventListener('click', () => {
  const row = model.rows.find(row => row.id === menuRowId);
  if (!row) {
    tableError.textContent = 'Unable to find the row requested for Properties.';
    tableError.hidden = false;
    return;
  }
  const values = element('properties-values');
  values.replaceChildren();
  const metadata = [
    ['Name', row.name], ['Type', row.kind], ['File ID', row.fileId],
    ['File Name', row.fileName], ['Channel Group', row.groupName],
  ];
  for (const [label, value] of metadata.filter(([, value]) => value)) {
    const name = document.createElement('dt');
    const detail = document.createElement('dd');
    name.textContent = label;
    detail.textContent = value;
    values.append(name, detail);
  }
  dialog.showModal();
});
element('close-properties').addEventListener('click', () => dialog.close());
element('theme').addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  element('nimble-theme').setAttribute('theme', dark ? 'dark' : 'light');
  element('x-axis-theme').setAttribute('theme', dark ? 'dark' : 'light');
  element('theme').textContent = dark ? 'Light theme' : 'Dark theme';
  applyTheme();
});
function applyTheme(): void {
  const styles = getComputedStyle(document.documentElement);
  document.body.style.setProperty('--ni-grafana-input-background', styles.getPropertyValue('--background'));
  document.body.style.setProperty('--ni-grafana-text-primary', styles.getPropertyValue('--text'));
  document.body.style.setProperty('--ni-grafana-border-medium', styles.getPropertyValue('--border'));
  document.body.style.setProperty('--ni-grafana-border-radius-default', '6px');
  document.body.style.setProperty('--ni-grafana-focus-color', '#00875a');
  document.body.style.setProperty('--ni-grafana-active-color', '#00875a');
}
applyTheme();
updateQuery();
