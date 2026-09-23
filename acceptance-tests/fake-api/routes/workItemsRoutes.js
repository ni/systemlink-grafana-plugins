import { workItems } from '../database/workItems.js';

class WorkItemsRoutes {
    queryWorkItems(req, res) {
        const { filter, take, returnCount } = req.body ?? {};

        // Extracts every quoted type value from the filter string regardless of operator.
        const typeValues = [...filter?.matchAll(/type\s*=\s*"([^"]+)"/g) ?? []].map(match => match[1]);
        const matchingWorkItems = typeValues.length > 0
            ? workItems.filter(workItem => typeValues.includes(workItem.type))
            : workItems;

        const limitedWorkItems = typeof take === 'number' ? matchingWorkItems.slice(0, take) : matchingWorkItems;

        res.status(200).json({
            workItems: returnCount ? [] : limitedWorkItems,
            totalCount: matchingWorkItems.length
        });
    }
}
export const workItemsRoutes = new WorkItemsRoutes();
