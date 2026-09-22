import { db } from '../database/db.js';

class WorkItemsRoutes {
    queryWorkItems(req, res) {
        if (req.method !== 'POST') {
            return;
        }

        const { filter, take, returnCount } = req.body;

        // Only the "type" clauses are interpreted; any other filter falls back to the full dataset.
        const typeMatches = [...(filter ?? '').matchAll(/type\s*=\s*"([^"]+)"/g)].map(match => match[1]);
        const filteredWorkItems = typeMatches.length > 0
            ? db.workItems.filter(workItem => typeMatches.includes(workItem.type))
            : db.workItems;

        if (take === 0 && returnCount) {
            res.status(200).json({ totalCount: filteredWorkItems.length });
            return;
        }

        res.status(200).json({ workItems: filteredWorkItems, totalCount: filteredWorkItems.length });
    }
}

export const workItemsRoutes = new WorkItemsRoutes();
