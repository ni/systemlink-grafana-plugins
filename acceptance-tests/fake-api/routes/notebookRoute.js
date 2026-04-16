import { db } from '../database/db.js';

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
        const results = executions.map(({ notebookId }) => ({
            id: `execution-${Date.now()}-${Math.random()}`,
            notebookId,
            status: 'QUEUED',
            queuedAt: new Date().toISOString()
        }));

        res.status(200).json({
            executions: results
        });
    }

    getExecution(req, res) {
        const { executionId } = req.params;

        res.status(200).json({
            id: executionId,
            notebookId: 'notebook-asset-list',
            status: 'SUCCEEDED',
            completedAt: new Date().toISOString(),
            result: db.notebookExecutions['notebook-asset-list'].result
        });
    }

    getNotebookMetadata(_req, res) {
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

export const notebookRoutes = new NotebookRoutes();
