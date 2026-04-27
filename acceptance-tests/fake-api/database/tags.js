// Mock tags matching the TagWithValue shape (V1 + V2 combined).
// Two tags live in 'default-workspace'; one extra 'temperature' tag lives
// in 'workspace-2' so workspace-prefix tests are possible.
export const tagsWithValues = [
    {
        tag: {
            path: 'Assets.National Instruments.SYSTEM-1.temperatureFirst',
            type: 'DOUBLE',
            datatype: 'DOUBLE',
            workspace: 'default-workspace',
            workspace_id: 'default-workspace',
            collect_aggregates: true,
            last_updated: 1745484000000,
            properties: {
                displayName: 'Room Temperature',
                units: 'celsius',
            },
        },
        current: {
            value: { value: '22.5' },
            timestamp: '2026-04-24T08:30:00.000Z',
        },
    },
    {
        tag: {
            path: 'Assets.National Instruments.SYSTEM-2.humidity',
            type: 'DOUBLE',
            datatype: 'DOUBLE',
            workspace: 'default-workspace',
            workspace_id: 'default-workspace',
            collect_aggregates: true,
            last_updated: 1745484000000,
            properties: {
                displayName: 'Room Humidity',
                units: 'percent',
            },
        },
        current: {
            value: { value: '55.3' },
            timestamp: '2026-04-24T08:30:00.000Z',
        },
    },
    {
        tag: {
            path: 'Assets.National Instruments.SYSTEM-1.temperatureSecond',
            type: 'DOUBLE',
            datatype: 'DOUBLE',
            workspace: 'workspace-2',
            workspace_id: 'workspace-2',
            collect_aggregates: true,
            last_updated: 1745484000000,
            properties: {
                displayName: 'Server Temperature',
                units: 'fahrenheit',
            },
        },
        current: {
            value: { value: '98.6' },
            timestamp: '2026-04-24T08:15:00.000Z',
        },
    },
];

// Historical values keyed by workspace → path.
// Used by the /nitaghistorian/v2/tags/query-decimated-history mock.
export const tagHistory = {
    'default-workspace': {
        temperature: {
            type: 'DOUBLE',
            values: [
                { timestamp: '2026-04-24T08:00:00.000Z', value: '21.5' },
                { timestamp: '2026-04-24T08:15:00.000Z', value: '21.8' },
                { timestamp: '2026-04-24T08:30:00.000Z', value: '22.1' },
                { timestamp: '2026-04-24T08:45:00.000Z', value: '22.5' },
                { timestamp: '2026-04-24T09:00:00.000Z', value: '22.8' },
            ],
        },
        humidity: {
            type: 'DOUBLE',
            values: [
                { timestamp: '2026-04-24T08:00:00.000Z', value: '55.0' },
                { timestamp: '2026-04-24T08:15:00.000Z', value: '55.5' },
                { timestamp: '2026-04-24T08:30:00.000Z', value: '55.3' },
                { timestamp: '2026-04-24T08:45:00.000Z', value: '56.1' },
                { timestamp: '2026-04-24T09:00:00.000Z', value: '56.8' },
            ],
        },
    },
    'workspace-2': {
        temperature: {
            type: 'DOUBLE',
            values: [
                { timestamp: '2026-04-24T08:00:00.000Z', value: '95.0' },
                { timestamp: '2026-04-24T08:15:00.000Z', value: '96.2' },
                { timestamp: '2026-04-24T08:30:00.000Z', value: '97.5' },
                { timestamp: '2026-04-24T08:45:00.000Z', value: '98.6' },
                { timestamp: '2026-04-24T09:00:00.000Z', value: '99.1' },
            ],
        },
    },
};
