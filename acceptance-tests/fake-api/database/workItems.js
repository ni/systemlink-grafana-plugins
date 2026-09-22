export const workItems = [
    {
        id: 'WI-0',
        name: 'Parent Work Order',
        type: 'reservation',
        state: 'IN_PROGRESS',
        workspace: 'default-workspace'
    },
    {
        id: 'WI-1',
        name: 'Work Item 1',
        type: 'maintenance',
        state: 'NEW',
        substate: 'Pending review',
        description: 'Sample work order description',
        parentId: 'WI-0',
        templateId: 'template-1',
        testProgram: 'Test Program A',
        partNumber: 'PN-1001',
        assignedTo: 'user-1',
        requestedBy: 'user-2',
        workspace: 'default-workspace',
        createdBy: 'user-3',
        updatedBy: 'user-4',
        createdAt: '2026-01-05T10:00:00.000Z',
        updatedAt: '2026-02-10T12:30:00.000Z',
        timeline: {
            earliestStartDateTime: '2026-01-10T08:00:00.000Z',
            dueDateTime: '2026-03-01T17:00:00.000Z',
            estimatedDurationInSeconds: 7200
        },
        schedule: {
            plannedStartDateTime: '2026-01-15T09:00:00.000Z',
            plannedEndDateTime: '2026-01-15T17:00:00.000Z',
            plannedDurationInSeconds: 28800
        },
        resources: {
            systems: {
                selections: [{ id: 'SYSTEM-1' }]
            }
        },
        properties: { priority: 'High' }
    },
    {
        id: 'WI-2',
        name: 'Work Item 2',
        type: 'testplan',
        state: 'CLOSED',
        workspace: 'default-workspace'
    },
    {
        id: 'WI-3',
        name: 'Work Item 3',
        type: 'job',
        state: 'NEW',
        workspace: 'default-workspace',
        resources: {
            assets: {
                selections: [{ id: 'ASSET-1' }, { id: 'ASSET-2' }]
            }
        }
    }
];
