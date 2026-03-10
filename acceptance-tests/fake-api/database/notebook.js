export const notebooks = [
    {
        id: 'notebook-asset-list',
        name: 'Asset List Notebook',
        workspace: 'default'
    }
];

export const notebookExecutions = {
    'notebook-asset-list': {
        id: 'execution-123',
        notebookId: 'notebook-asset-list',
        status: 'SUCCEEDED',
        result: {
            result: [
                {
                    id: 'asset_list',
                    type: 'data_frame',
                    data: {
                        columns: [
                            { name: 'id', type: 'string' },
                            { name: 'assetType', type: 'string' },
                            { name: 'name', type: 'string' },
                            { name: 'minionId', type: 'string' },
                            { name: 'modelName', type: 'string' },
                            { name: 'serialNumber', type: 'string' }
                        ],
                        values: [
                            ['id1', 'GENERIC', 'Asset 1', 'minion-id1', 'Model A', 'SN001'],
                            ['id2', 'CALIBRATABLE', 'Asset 2', 'minion-id2', 'Model B', 'SN002'],
                            ['id3', 'DEVICE_UNDER_TEST', 'Asset 3', 'minion-id3', 'Model C', 'SN003'],
                            ['id4', 'GENERIC', 'Asset 4', 'minion-id4', 'Model D', 'SN004'],
                            ['id5', 'CALIBRATABLE', 'Asset 5', 'minion-id5', 'Model E', 'SN005'],
                            ['id6', 'GENERIC', 'Asset 6', 'minion-id6', 'Model F', 'SN006']
                        ]
                    }
                }
            ]
        }
    }
};