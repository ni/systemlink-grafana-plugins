const oneDayAgoISO = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
const twoDaysAgoISO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const threeDaysAgoISO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

export const tagsWithValues = [
    {
        tag: {
            path: 'Assets.vendor1.model1.serial1.Voltage',
            type: 'DOUBLE',
            datatype: 'DOUBLE',
            workspace: 'default-workspace',
            workspace_id: 'default-workspace',
            collect_aggregates: true,
            last_updated: 1745484000000,
            properties: {
                displayName: 'Voltage',
                units: 'volt',
            },
        },
        current: {
            value: { value: '12.1' },
            timestamp: oneDayAgoISO,
        },
    },
    {
        tag: {
            path: 'Assets.vendor1.model1.serial1.Current',
            type: 'DOUBLE',
            datatype: 'DOUBLE',
            workspace: 'default-workspace',
            workspace_id: 'default-workspace',
            collect_aggregates: true,
            last_updated: 1745484000000,
            properties: {
                displayName: 'Current',
                units: 'ampere',
            },
        },
        current: {
            value: { value: '3.5' },
            timestamp: threeDaysAgoISO,
        },
    },
    {
        tag: {
            path: 'Assets.vendor2.model2.serial2.Volume',
            type: 'DOUBLE',
            datatype: 'DOUBLE',
            workspace: 'workspace-2',
            workspace_id: 'workspace-2',
            collect_aggregates: true,
            last_updated: 1745484000000,
            properties: {
                units: 'liter',
            },
        },
        current: {
            value: { value: '4.1' },
            timestamp: twoDaysAgoISO,
        },
    }
];

export const tagHistory = {
    'default-workspace': {
        'Assets.vendor1.model1.serial1.Voltage': {
            type: 'DOUBLE',
            values: [
                { timestamp: '2026-04-24T08:15:00.000Z', value: '12.0' },
                { timestamp: '2026-04-24T08:30:00.000Z', value: '12.1' },
                { timestamp: '2026-04-24T08:45:00.000Z', value: '12.3' },
            ],
        },
        'Assets.vendor1.model1.serial1.Current': {
            type: 'DOUBLE',
            values: [
                { timestamp: '2026-04-24T08:45:00.000Z', value: '3.6' },
                { timestamp: '2026-04-24T09:00:00.000Z', value: '3.8' },
            ],
        },
    },
    'workspace-2': {
        'Assets.vendor2.model2.serial2.Volume': {
            type: 'DOUBLE',
            values: [
                { timestamp: '2026-04-24T08:00:00.000Z', value: '3.8' },
                { timestamp: '2026-04-24T08:15:00.000Z', value: '4.0' },
                { timestamp: '2026-04-24T08:30:00.000Z', value: '4.1' },
            ],
        }
    }
};
