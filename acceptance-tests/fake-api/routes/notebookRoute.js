import { db } from '../database/db.js';

const executionParameters = {};

class NotebookRoutes {
    listNotebooks(_req, res) {
        res.status(200).json({
            webapps: db.notebooks.map(nb => ({
                ...nb,
                type: 'Notebook'
            })),
            totalCount: db.notebooks.length
        });
    }

    createExecution(req, res) {
        const executions = req.body;
        const results = executions.map(({ notebookId, parameters }) => {
            const id = `execution-${Date.now()}-${Math.random()}`;
            executionParameters[id] = { notebookId, parameters: parameters || {} };
            return {
                id,
                notebookId,
                status: 'QUEUED',
                queuedAt: new Date().toISOString()
            };
        });

        res.status(200).json({
            executions: results
        });
    }

    getExecution(req, res) {
        const executionId = req.params.executionId;
        const { notebookId = 'notebook-asset-list', parameters = {} } = executionParameters[executionId] || {};
        let result = db.notebookExecutions[notebookId]?.result
            ?? db.notebookExecutions['notebook-asset-list'].result;

        if (notebookId === 'notebook-asset-filter' && parameters.asset_id) {
            const assetId = parameters.asset_id;
            result = {
                result: result.result.map(output => {
                    const idColumnIndex = output.data.columns.findIndex(col => col.name === 'id');
                    return {
                        ...output,
                        data: {
                            ...output.data,
                            values: output.data.values.filter(row => row[idColumnIndex] === assetId)
                        }
                    };
                })
            };
        } else if (notebookId === 'notebook-asset-filter') {
            result = db.notebookExecutions['notebook-asset-filter'].result;
        }

        res.status(200).json({
            id: executionId,
            notebookId,
            status: 'SUCCEEDED',
            completedAt: new Date().toISOString(),
            result
        });
    }

    getNotebookMetadata(req, res) {
        const id = req.params.id;

        if (id === 'notebook-asset-filter') {
            res.status(200).json({
                metadata: {
                    version: 2,
                    outputs: [
                        {
                            id: 'decoy_output',
                            display_name: 'Decoy Output',
                            type: 'data_frame'
                        },
                        {
                            id: 'filtered_assets',
                            display_name: 'Filtered Assets',
                            type: 'data_frame'
                        }
                    ],
                    parameters: [
                        {
                            id: 'asset_id',
                            display_name: 'Asset Id',
                            type: 'string'
                        }
                    ]
                },
                parameters: { asset_id: '' }
            });
        }
        if (id === 'notebook-asset-list') {
            res.status(200).json({
                metadata: {
                    version: 2,
                    outputs: [
                        {
                            id: 'asset_list',
                            display_name: 'Asset List',
                            type: 'data_frame'
                        },
                        {
                            id: 'decoy_output',
                            display_name: 'Decoy Output',
                            type: 'data_frame'
                        }
                    ],
                    parameters: []
                },
                parameters: {}
            });
        }
    }
}

export const notebookRoutes = new NotebookRoutes();
