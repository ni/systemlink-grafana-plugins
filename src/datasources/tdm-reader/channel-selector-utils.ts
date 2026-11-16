import type { TableRecord } from '@ni/nimble-react/table';
import { ChannelRecord } from './types';

export const MAX_CHANNEL_SELECTIONS = 10;

export function getSelectedChannelCount(selectedIds: string[]): number {
  return selectedIds.length;
}

export interface SelectorRow extends TableRecord {
  id: string;
  parentId?: string;
  name: string;
  kind: 'file' | 'group' | 'channel' | 'merged';
  fileId: string;
  fileName: string;
  groupName: string;
}

export interface SelectorRows {
  rows: SelectorRow[];
  channelIdsByRow: Map<string, string[]>;
}

export function buildSelectorRows(channels: ChannelRecord[], merged: boolean): SelectorRows {
  const rows: SelectorRow[] = [];
  const channelIdsByRow = new Map<string, string[]>();
  const files = new Map<string, ChannelRecord[]>();
  for (const channel of channels) {
    const key = merged ? channel.name : channel.fileId;
    const instances = files.get(key) ?? [];
    instances.push(channel);
    files.set(key, instances);
  }
  if (merged) {
    for (const [name, instances] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
      const id = JSON.stringify(['merged', name]);
      rows.push({ id, name: `${name} (${instances.length})`, kind: 'merged', fileId: '', fileName: '', groupName: '', baseName: name });
      channelIdsByRow.set(id, instances.map(channel => channel.id));
    }
    return { rows, channelIdsByRow };
  }
  for (const [fileId, instances] of files) {
    const fileRowId = JSON.stringify(['file', fileId]);
    const fileName = instances[0].fileName;
    if (files.size > 1) {
      rows.push({ id: fileRowId, name: fileName, kind: 'file', fileId, fileName, groupName: '' });
      channelIdsByRow.set(fileRowId, instances.map(channel => channel.id));
    }
    const groups = new Map<string, ChannelRecord[]>();
    for (const channel of instances) {
      const group = groups.get(channel.groupName) ?? [];
      group.push(channel);
      groups.set(channel.groupName, group);
    }
    for (const [groupName, group] of groups) {
      const id = JSON.stringify(['group', fileId, groupName]);
      rows.push({ id, parentId: files.size > 1 ? fileRowId : undefined, name: groupName, kind: 'group', fileId, fileName, groupName });
      channelIdsByRow.set(id, group.map(channel => channel.id));
      for (const channel of group) {
        rows.push({ id: channel.id, parentId: id, name: channel.name, kind: 'channel', fileId, fileName, groupName });
        channelIdsByRow.set(channel.id, [channel.id]);
      }
    }
  }
  return { rows, channelIdsByRow };
}

export function filterSelectorRows(rows: SelectorRow[], search: string): SelectorRow[] {
  const term = search.trim().toLowerCase();
  if (!term) {
    return rows;
  }
  const byId = new Map(rows.map(row => [row.id, row]));
  const visible = new Set<string>();
  for (const row of rows) {
    const name = row.kind === 'merged' ? String(row.baseName) : row.name;
    if (name.toLowerCase().includes(term)) {
      let current: SelectorRow | undefined = row;
      while (current && !visible.has(current.id)) {
        visible.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
    }
  }
  return rows.filter(row => visible.has(row.id));
}

export function updateChannelSelection(
  selectedIds: string[],
  previousRowIds: string[],
  selectedRowIds: string[],
  model: SelectorRows
): string[] {
  const selected = new Set(selectedIds);
  const previous = new Set(previousRowIds);
  const raw = new Set(selectedRowIds);
  const removed = previousRowIds.filter(id => !raw.has(id));
  const rowsById = new Map(model.rows.map(row => [row.id, row]));
  for (const id of removed) {
    const descendants = model.channelIdsByRow.get(id) ?? [];
    const descendantRemoval = removed.some(otherId => {
      let row = rowsById.get(otherId);
      while (row?.parentId) {
        if (row.parentId === id) {
          return true;
        }
        row = rowsById.get(row.parentId);
      }
      return false;
    });
    for (const channelId of descendants) {
      if (!descendantRemoval || !raw.has(channelId)) {
        selected.delete(channelId);
      }
    }
  }
  for (const id of selectedRowIds) {
    if (!previous.has(id)) {
      for (const channelId of model.channelIdsByRow.get(id) ?? []) {
        selected.add(channelId);
      }
    }
  }
  return [...selected];
}
