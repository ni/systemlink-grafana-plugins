import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Combobox, ComboboxOption, InlineField, Modal, useTheme2 } from '@grafana/ui';
import { NimbleTable, Table, fromTableRef, type TableRecord } from '@ni/nimble-react/table';
import { NimbleTableColumnText } from '@ni/nimble-react/table-column/text';
import { NimbleThemeProvider } from '@ni/nimble-react/theme-provider';
import { NimbleTextField } from '@ni/nimble-react/text-field';
import { NimbleButton } from '@ni/nimble-react/button';
import { NimbleIconMagnifyingGlass } from '@ni/nimble-react/icons/magnifying-glass';
import { NimbleIconTimes } from '@ni/nimble-react/icons/times';
import { NimbleCheckbox } from '@ni/nimble-react/checkbox';
import { ChannelRecord, SAMPLE_INDEX_AXIS_ID, TDM_READER_FIELD_LABEL_WIDTH, TIMESTAMP_AXIS_ID } from '../types';
import './TdmReaderQueryEditor.scss';

interface AxisOption extends TableRecord {
  id: string;
  channel: string;
  fileName: string;
  group: string;
}

interface Props {
  channels: ChannelRecord[];
  selectedChannelIds: string[];
  selectedId: string;
  onChange: (id: string) => void;
}

export function XAxisSelector({ channels, selectedChannelIds, selectedId, onChange }: Props) {
  const theme = useTheme2();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [draftSelectedId, setDraftSelectedId] = useState(selectedId);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [tableError, setTableError] = useState<string>();
  const tableRef = useRef<Table<AxisOption>>(null);
  const updatingRef = useRef(false);
  const options = useMemo<AxisOption[]>(() => [
    { id: SAMPLE_INDEX_AXIS_ID, channel: 'Sample Index', fileName: '', group: '' },
    { id: TIMESTAMP_AXIS_ID, channel: 'Timestamp', fileName: '', group: '' },
    ...channels.map(channel => ({
      id: channel.id,
      channel: channel.name,
      fileName: channel.fileName,
      group: channel.groupName,
    })),
  ], [channels]);
  const scopedOptions = useMemo(() => {
    if (showAll) {
      return options;
    }
    const selected = new Set(selectedChannelIds);
    const pinned = new Set(pinnedIds);
    return options.filter(option =>
      option.id === SAMPLE_INDEX_AXIS_ID
      || option.id === TIMESTAMP_AXIS_ID
      || pinned.has(option.id)
      || selected.has(option.id)
    );
  }, [options, selectedChannelIds, showAll, pinnedIds]);
  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? scopedOptions.filter(option => `${option.channel} ${option.fileName} ${option.group}`.toLowerCase().includes(term))
      : scopedOptions;
  }, [scopedOptions, search]);
  const selectedOption = options.find(option => option.id === selectedId);
  const comboboxOptions = useMemo<Array<ComboboxOption<string>>>(
    () => options.map(option => ({ value: option.id, label: option.channel })),
    [options]
  );

  useEffect(() => {
    if (isOpen) {
      setDraftSelectedId(selectedId);
      setPinnedIds([selectedId]);
      setSearch('');
      setTableError(undefined);
    }
  }, [isOpen, selectedId]);

  useEffect(() => {
    const table = tableRef.current;
    if (!isOpen || !table) {
      return;
    }
    let cancelled = false;
    updatingRef.current = true;
    void (async () => {
      try {
        await table.setData(filteredOptions);
        await table.setSelectedRecordIds(filteredOptions.some(option => option.id === draftSelectedId) ? [draftSelectedId] : []);
      } catch (error) {
        if (!cancelled) {
          setTableError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          updatingRef.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
      updatingRef.current = false;
    };
  }, [draftSelectedId, filteredOptions, isOpen]);

  return (
    <div className="tdm-reader-x-axis">
      <InlineField label="X-Channel" labelWidth={TDM_READER_FIELD_LABEL_WIDTH} grow>
        <div
          className="tdm-reader-x-axis-value"
          onClickCapture={() => setIsOpen(true)}
          onKeyDown={event => {
            // Keep the combobox display-only: only keys that open the dialog or move focus are allowed.
            if (event.key !== 'Tab') {
              event.preventDefault();
            }
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
              setIsOpen(true);
            }
          }}
          onFocusCapture={event => {
            event.currentTarget.querySelector('input')?.blur();
          }}
        >
          <Combobox<string>
            options={comboboxOptions}
            value={selectedOption ? selectedOption.id : null}
            placeholder="Select an x-channel"
            onChange={() => undefined}
          />
        </div>
      </InlineField>
      <Modal title="X-Channel Selection" isOpen={isOpen} onDismiss={() => setIsOpen(false)}>
        <div className="tdm-reader-x-axis-dialog">
          <p>Select a single x-channel</p>
          <NimbleThemeProvider theme={theme.isDark ? 'dark' : 'light'} className="tdm-reader-theme">
            <div className="tdm-reader-channel-toolbar">
              <NimbleTextField
                className="tdm-reader-channel-search"
                placeholder="Search"
                aria-label="Search x-channels"
                value={search}
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
              {draftSelectedId && (
                <NimbleButton appearance="ghost" title="Clear selection"                 aria-label="Clear x-channel selection"
                  onClick={() => setDraftSelectedId('')}>
                  <NimbleIconTimes slot="start" />
                  <span aria-live="polite">1 selected</span>
                </NimbleButton>
              )}
            </div>
            {tableError && <Alert title="Unable to update x-axes" severity="error">{tableError}</Alert>}
            <div className="tdm-reader-table-container">
              <NimbleTable
                ref={fromTableRef(tableRef)}
                idFieldName="id"
                selectionMode="single"
                aria-label="Available x-channels"
                className="tdm-reader-channel-table"
                onSelectionChange={event => {
                  if (!updatingRef.current) {
                    const id = event.detail.selectedRecordIds[0] ?? '';
                    setDraftSelectedId(id);
                    if (id) {
                      setPinnedIds(previous => (previous.includes(id) ? previous : [...previous, id]));
                    }
                  }
                }}
              >
                <NimbleTableColumnText columnId="channel" fieldName="channel" sortingDisabled>
                  Channel
                </NimbleTableColumnText>
                <NimbleTableColumnText columnId="fileName" fieldName="fileName" sortingDisabled>
                  File Name
                </NimbleTableColumnText>
                <NimbleTableColumnText columnId="group" fieldName="group" sortingDisabled>
                  Group
                </NimbleTableColumnText>
              </NimbleTable>
            </div>
          </NimbleThemeProvider>
          <div className="tdm-reader-x-axis-actions">
            <NimbleThemeProvider theme={theme.isDark ? 'dark' : 'light'} className="tdm-reader-theme">
              <NimbleCheckbox checked={showAll} onChange={event => setShowAll(event.target.checked)}>
                Show all channels
              </NimbleCheckbox>
            </NimbleThemeProvider>
            <div>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (draftSelectedId) {
                    onChange(draftSelectedId);
                  }
                  setIsOpen(false);
                }}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
