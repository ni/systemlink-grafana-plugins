import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Collapse, Modal, useTheme2 } from '@grafana/ui';
import { NimbleTable, Table, fromTableRef } from '@ni/nimble-react/table';
import { NimbleTableColumnText } from '@ni/nimble-react/table-column/text';
import { NimbleThemeProvider } from '@ni/nimble-react/theme-provider';
import { NimbleToggleButton } from '@ni/nimble-react/toggle-button';
import { NimbleButton } from '@ni/nimble-react/button';
import { NimbleTextField } from '@ni/nimble-react/text-field';
import { NimbleMenu } from '@ni/nimble-react/menu';
import { MenuItem, NimbleMenuItem } from '@ni/nimble-react/menu-item';
import { NimbleIconList } from '@ni/nimble-react/icons/list';
import { NimbleIconListTree } from '@ni/nimble-react/icons/list-tree';
import { NimbleIconTimes } from '@ni/nimble-react/icons/times';
import { NimbleIconMagnifyingGlass } from '@ni/nimble-react/icons/magnifying-glass';
import { ChannelRecord } from '../types';
import { buildSelectorRows, filterSelectorRows, getSelectedChannelCount, MAX_CHANNEL_SELECTIONS, SelectorRow, updateChannelSelection } from '../channel-selector-utils';
import './TdmReaderQueryEditor.scss';

interface Props {
  channels: ChannelRecord[];
  selectedIds: string[];
  view: 'hierarchy' | 'merged';
  emptyMessage?: string;
  onSelectionChange: (ids: string[]) => void;
  onViewChange: (view: 'hierarchy' | 'merged') => void;
}

export function ChannelsSelector({ channels, selectedIds, view, emptyMessage, onSelectionChange, onViewChange }: Props) {
  const theme = useTheme2();
  const selectedChannelCount = getSelectedChannelCount(selectedIds);
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [tableError, setTableError] = useState<string>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [limitWarningDismissed, setLimitWarningDismissed] = useState(false);
  const [limitReachedDismissed, setLimitReachedDismissed] = useState(false);
  const [propertiesRow, setPropertiesRow] = useState<SelectorRow>();
  const [syncRevision, setSyncRevision] = useState(0);
  const tableRef = useRef<Table<SelectorRow>>(null);
  const previousRowIds = useRef<string[]>([]);
  const actionMenuRowId = useRef<string>();
  const propertiesMenuItem = useRef<MenuItem>(null);
  const menuOpen = useRef(false);
  const lastDataRef = useRef<SelectorRow[]>();
  const lastTableRef = useRef<Table<SelectorRow>>();
  const updateQueue = useRef<Promise<void>>(Promise.resolve());
  const updatingRef = useRef(false);
  const model = useMemo(() => buildSelectorRows(channels, view === 'merged'), [channels, view]);
  const records = useMemo(() => filterSelectorRows(model.rows, search), [model, search]);
  const visibleSelection = useMemo(() => {
    const selected = new Set(selectedIds);
    return records.filter(row => model.channelIdsByRow.get(row.id)?.every(id => selected.has(id))).map(row => row.id);
  }, [records, model, selectedIds]);

  useEffect(() => {
    const item = propertiesMenuItem.current;
    if (!item) {
      return;
    }
    const showProperties = () => {
      const row = model.rows.find(row => row.id === actionMenuRowId.current);
      if (!row) {
        setTableError('Unable to find the row requested for Properties.');
        return;
      }
      setPropertiesRow(row);
    };
    // Nimble's action menu stops click bubbling before React's delegated handler.
    item.addEventListener('click', showProperties);
    return () => item.removeEventListener('click', showProperties);
  }, [model, isOpen]);

  useEffect(() => {
    setLimitWarningDismissed(false);
    if (selectedChannelCount < MAX_CHANNEL_SELECTIONS) {
      setLimitReachedDismissed(false);
    }
  }, [selectedChannelCount]);

  useEffect(() => {
    let cancelled = false;
    const table = tableRef.current;
    if (!table) {
      return;
    }
    updatingRef.current = true;
    setIsUpdating(true);
    updateQueue.current = updateQueue.current.then(async () => {
      if (cancelled) {
        return;
      }
      try {
        if (lastDataRef.current !== records || lastTableRef.current !== table) {
          await table.setData(records);
          lastDataRef.current = records;
          lastTableRef.current = table;
        }
        if (!cancelled) {
          await table.setSelectedRecordIds(visibleSelection);
          previousRowIds.current = visibleSelection;
          if (!table.checkValidity()) {
            throw new Error('The channel table configuration is invalid.');
          }
          setTableError(undefined);
        }
      } catch (error) {
        if (!cancelled) {
          setTableError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          updatingRef.current = false;
          setIsUpdating(false);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [records, visibleSelection, view, syncRevision, isOpen]);

  const propertiesChannels = propertiesRow ? channels.filter(channel =>
    model.channelIdsByRow.get(propertiesRow.id)?.includes(channel.id)
  ) : [];
  const properties = propertiesRow ? [
    ['Name', propertiesRow.name],
    ['Type', propertiesRow.kind],
    ['File ID', propertiesRow.fileId],
    ['File Name', propertiesRow.fileName],
    ['Channel Group', propertiesRow.groupName],
    ['Channels', String(propertiesChannels.length)],
    ...(propertiesRow.kind === 'channel' ? [
      ['Data Type', 'Float64 (mock)'],
      ['Sample Count', '10'],
      ['Value Offset', String(propertiesChannels[0]?.offset)],
    ] : []),
  ] : [];

  return (
    <div className="tdm-reader-channels">
      <Collapse label="Channels" isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
        <NimbleThemeProvider theme={theme.isDark ? 'dark' : 'light'} className="tdm-reader-theme">
          <div className="tdm-reader-channel-warnings">
            {selectedChannelCount === MAX_CHANNEL_SELECTIONS && !limitReachedDismissed && (
              <Alert severity="info" title="Channel limit reached" onRemove={() => setLimitReachedDismissed(true)}>
                Maximum of {MAX_CHANNEL_SELECTIONS} channel selections reached.
              </Alert>
            )}
            {selectedChannelCount > MAX_CHANNEL_SELECTIONS && !limitWarningDismissed && (
              <Alert severity="warning" title="Too many channels selected" onRemove={() => {
                setLimitWarningDismissed(true);
                setLimitReachedDismissed(true);
              }}>
                More than {MAX_CHANNEL_SELECTIONS} channels selected. Reduce the selection to {MAX_CHANNEL_SELECTIONS} or fewer to run the query.
              </Alert>
            )}
          </div>
          <div className="tdm-reader-channel-toolbar">
            <div className="tdm-reader-view-buttons" role="group" aria-label="Channel view">
              <NimbleToggleButton
                appearance="block" contentHidden title="View nested channels" aria-label="View nested channels"
                checked={view === 'hierarchy'} disabled={view === 'hierarchy'}
                className={view === 'hierarchy' ? 'tdm-reader-view-active' : ''}
                onChange={event => event.target.checked && onViewChange('hierarchy')}
              >
                <NimbleIconListTree slot="start" />
                View nested channels
              </NimbleToggleButton>
              <NimbleToggleButton
                appearance="block" contentHidden title="View merged channels" aria-label="View merged channels"
                checked={view === 'merged'} disabled={view === 'merged'}
                className={view === 'merged' ? 'tdm-reader-view-active' : ''}
                onChange={event => event.target.checked && onViewChange('merged')}
              >
                <NimbleIconList slot="start" />
                View merged channels
              </NimbleToggleButton>
            </div>
            <NimbleTextField
              className="tdm-reader-channel-search" placeholder="Search"
              aria-label="Search channels" value={search}
              onInput={event => setSearch(event.target.value)}
            >
              <NimbleIconMagnifyingGlass slot="start" />
              {search && (
                <NimbleButton slot="end" appearance="ghost" contentHidden title="Clear search"
                  aria-label="Clear search" onClick={() => setSearch('')}>
                  <NimbleIconTimes slot="start" />
                  Clear search
                </NimbleButton>
              )}
            </NimbleTextField>
            <div className="tdm-reader-toolbar-spacer" />
            {selectedIds.length > 0 && (
              <NimbleButton appearance="ghost" title="Clear selection" aria-label="Clear channel selection"
                onClick={() => {
                  setLimitWarningDismissed(false);
                  onSelectionChange([]);
                }}>
                <NimbleIconTimes slot="start" />
                <span aria-live="polite">{selectedChannelCount} {selectedChannelCount === 1 ? 'channel' : 'channels'} selected</span>
              </NimbleButton>
            )}
          </div>
          {tableError && <Alert title="Unable to update channels" severity="error">{tableError}</Alert>}
          {emptyMessage && <p className="tdm-reader-empty">{emptyMessage}</p>}
          {!emptyMessage && channels.length > 0 && records.length === 0 && (
            <p className="tdm-reader-empty">No channels match your search.</p>
          )}
          <div className="tdm-reader-table-container" aria-busy={isUpdating}>
            <NimbleTable
              ref={fromTableRef(tableRef)} idFieldName="id" parentIdFieldName="parentId"
              selectionMode="multiple" actionMenusPreserveSelection
              aria-label="Available channels" className="tdm-reader-channel-table"
              onActionMenuBeforeToggle={event => {
                if (event.detail.newState) {
                  actionMenuRowId.current = event.detail.operatingRecordId;
                }
              }}
              onActionMenuToggle={event => { menuOpen.current = event.detail.newState; }}
              onSelectionChange={event => {
                if (updatingRef.current || menuOpen.current) {
                  return;
                }
                const updated = updateChannelSelection(selectedIds, previousRowIds.current, event.detail.selectedRecordIds, model);
                onSelectionChange(updated);
                setSyncRevision(revision => revision + 1);
              }}
            >
              <NimbleTableColumnText columnId="name" fieldName="name" groupingDisabled sortingDisabled
                actionMenuSlot={view === 'hierarchy' ? 'channel-actions' : undefined}
                actionMenuLabel="Channel actions">
                Name
              </NimbleTableColumnText>
              {view === 'hierarchy' && (
                <NimbleMenu slot="channel-actions">
                  <NimbleMenuItem ref={propertiesMenuItem}>Properties</NimbleMenuItem>
                </NimbleMenu>
              )}
            </NimbleTable>
          </div>
        </NimbleThemeProvider>
      </Collapse>
      <Modal title="Properties" isOpen={propertiesRow !== undefined} onDismiss={() => setPropertiesRow(undefined)}>
        <p>Illustrative mock metadata. No file or SystemLink API is read.</p>
        <dl className="tdm-reader-properties">
          {properties.filter(([, value]) => value !== '').map(([name, value]) => (
            <React.Fragment key={name}><dt>{name}</dt><dd>{value}</dd></React.Fragment>
          ))}
        </dl>
      </Modal>
    </div>
  );
}
