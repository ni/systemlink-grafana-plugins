import { ChannelRecord, MockTdmFile } from './types';

export const MOCK_TDM_FILES: MockTdmFile[] = [
  {
    fileId: 'tdm-file-001',
    fileName: 'Current Gain Calibration.tdms',
    groups: [
      {
        id: 'dut',
        name: 'DUT Configuration',
        channels: [
          { id: 'volt-range', name: 'DutVoltRange', offset: 10 },
          { id: 'channels', name: 'DutChannels', offset: 2 },
          { id: 'op-mode', name: 'DutOpMode', offset: 1 },
          { id: 'feature', name: 'DutFeature', offset: 4 },
        ],
      },
      {
        id: 'current-gain',
        name: 'Current Gain Calibration - 100uA N-D Data',
        channels: [
          { id: 'y', name: 'YValues', offset: 0.1 },
          { id: 'x', name: 'XValues', offset: 0 },
          { id: 'lower', name: 'Lower Limit', offset: -0.05 },
          { id: 'upper', name: 'Upper Limit', offset: 0.05 },
        ],
      },
      {
        id: 'voltage-gain',
        name: 'Voltage Gain Calibration',
        channels: [
          { id: 'y', name: 'YValues', offset: 5 },
          { id: 'x', name: 'XValues', offset: 1 },
          { id: 'lower', name: 'Lower Limit', offset: 4.9 },
          { id: 'upper', name: 'Upper Limit', offset: 5.1 },
        ],
      },
    ],
  },
  {
    fileId: 'tdm-file-002',
    fileName: 'Temperature Measurement.tdm',
    groups: [
      {
        id: 'temperature',
        name: 'Temperature',
        channels: [
          { id: 'ambient', name: 'Ambient Temperature', offset: 23 },
          { id: 'dut', name: 'DUT Temperature', offset: 35 },
          { id: 'lower', name: 'Lower Limit', offset: 20 },
          { id: 'upper', name: 'Upper Limit', offset: 40 },
        ],
      },
    ],
  },
  {
    fileId: 'tdm-file-003',
    fileName: 'Current Gain Verification.tdms',
    groups: [
      {
        id: 'current-gain',
        name: 'Current Gain Calibration - 100uA N-D Data',
        channels: [
          { id: 'y', name: 'YValues', offset: 0.2 },
          { id: 'x', name: 'XValues', offset: 0 },
          { id: 'lower', name: 'Lower Limit', offset: -0.1 },
          { id: 'upper', name: 'Upper Limit', offset: 0.1 },
        ],
      },
    ],
  },
];

export function getChannelRecords(files: MockTdmFile[]): ChannelRecord[] {
  return files.flatMap(file =>
    file.groups.flatMap(group =>
      group.channels.map(channel => ({
        id: JSON.stringify([file.fileId, group.id, channel.id]),
        name: channel.name,
        fileId: file.fileId,
        fileName: file.fileName,
        fileLabel: `${file.fileName} (${file.fileId})`,
        groupName: group.name,
        offset: channel.offset,
      }))
    )
  );
}
