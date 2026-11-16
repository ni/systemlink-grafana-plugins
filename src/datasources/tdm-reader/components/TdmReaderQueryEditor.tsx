import React, { useEffect, useMemo, useState } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { Alert, Collapse, Combobox, InlineField } from '@grafana/ui';
import { decimationMethods } from '../../data-frame/constants';
import { TdmReaderDataSource } from '../TdmReaderDataSource';
import { getChannelRecords } from '../mock-data';
import { getFileFilterState, retainChannelSelection } from '../query-utils';
import { DEFAULT_FILE_ID, SAMPLE_INDEX_AXIS_ID, TIMESTAMP_AXIS_ID, TDM_READER_FIELD_LABEL_WIDTH, TdmFilter, TdmReaderQuery } from '../types';
import { ChannelsSelector } from './ChannelsSelector';
import { TdmReaderQueryBuilder } from './TdmReaderQueryBuilder';
import { XAxisSelector } from './XAxisSelector';
import './TdmReaderQueryEditor.scss';

type Props = QueryEditorProps<TdmReaderDataSource, TdmReaderQuery>;
const emptySelection: string[] = [];
const defaultFileFilter: TdmFilter = [['fileId', '=', DEFAULT_FILE_ID]];

export function TdmReaderQueryEditor({ query, onChange, onRunQuery }: Props) {
  const [filterError, setFilterError] = useState<string>();
  const [isDecimationOpen, setIsDecimationOpen] = useState(true);
  const fileFilter = query.fileFilter ?? defaultFileFilter;
  const state = useMemo(() => getFileFilterState(fileFilter), [fileFilter]);
  const channels = useMemo(() => getChannelRecords(state.files), [state.files]);
  const availableAxisIds = useMemo(() => new Set([
    SAMPLE_INDEX_AXIS_ID,
    TIMESTAMP_AXIS_ID,
    ...channels.map(channel => channel.id),
  ]), [channels]);
  const selectedAxisId = query.xAxisId && availableAxisIds.has(query.xAxisId) ? query.xAxisId : SAMPLE_INDEX_AXIS_ID;
  const selectedIds = query.selectedChannelIds ?? emptySelection;
  const availableIds = useMemo(() => channels.map(channel => channel.id), [channels]);
  const visibleSelectedIds = useMemo(() => retainChannelSelection(selectedIds, availableIds), [selectedIds, availableIds]);

  useEffect(() => {
    const channelSelectionChanged = JSON.stringify(selectedIds) !== JSON.stringify(visibleSelectedIds);
    const xAxisChanged = query.xAxisId !== selectedAxisId;
    if (!state.error && (channelSelectionChanged || xAxisChanged)) {
      onChange({ ...query, selectedChannelIds: visibleSelectedIds, xAxisId: selectedAxisId });
      if (channelSelectionChanged) {
        onRunQuery();
      }
    }
  }, [query, selectedAxisId, selectedIds, visibleSelectedIds, state.error, onChange, onRunQuery]);

  const onFilterChange = (value: unknown) => {
    const updated = getFileFilterState(value);
    setFilterError(updated.error);
    if (updated.error) {
      return;
    }
    onChange({
      ...query,
      fileFilter: updated.filter,
      selectedChannelIds: retainChannelSelection(selectedIds, getChannelRecords(updated.files).map(channel => channel.id)),
    });
    onRunQuery();
  };

  const emptyMessage = state.empty
    ? 'Add a File ID or File Name condition to see mock files and channels.'
    : channels.length === 0 && !state.error
      ? 'No mock files match this filter.'
      : undefined;

  return (
    <div className="tdm-reader-query-editor">
      <InlineField label="Query" labelWidth={TDM_READER_FIELD_LABEL_WIDTH} grow>
        <div className="tdm-reader-query-content">
          <TdmReaderQueryBuilder filter={fileFilter} onChange={onFilterChange} />
          {(filterError || state.error) && (
            <Alert title="Invalid file filter" severity="error">{filterError || state.error}</Alert>
          )}
        </div>
      </InlineField>
      <ChannelsSelector
        channels={channels}
        selectedIds={visibleSelectedIds}
        view={!query.channelView || query.channelView === 'hierarchy' ? 'hierarchy' : 'merged'}
        emptyMessage={emptyMessage}
        onSelectionChange={ids => {
          onChange({ ...query, selectedChannelIds: ids });
          onRunQuery();
        }}
        onViewChange={channelView => onChange({ ...query, channelView })}
      />
      <div className="tdm-reader-decimation">
        <Collapse label="Decimation settings" isOpen={isDecimationOpen} onToggle={() => setIsDecimationOpen(!isDecimationOpen)}>
          <XAxisSelector
            channels={channels}
            selectedChannelIds={visibleSelectedIds}
            selectedId={selectedAxisId}
            onChange={xAxisId => {
              onChange({ ...query, xAxisId });
              onRunQuery();
            }}
          />
          <InlineField label="Decimation method" labelWidth={TDM_READER_FIELD_LABEL_WIDTH} grow
            tooltip="Specifies the method used to decimate the data. Mockup only: this choice does not change sample output.">
            <Combobox
              value={query.decimationMethod ?? 'LOSSY'}
              options={decimationMethods}
              onChange={option => onChange({ ...query, decimationMethod: option.value })}
            />
          </InlineField>
        </Collapse>
      </div>
    </div>
  );
}
