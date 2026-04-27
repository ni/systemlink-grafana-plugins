import { tagsWithValues, tagHistory } from '../database/tags.js';

class TagRoutes {
    /**
     * POST /nitag/v2/fetch-tags-with-values
     * Called by TagDataSource to load the current value of one or more tags.
     *
     * Body: { paths: string[], workspaces: string[], take: number }
     *   - workspaces may contain "*" to match all workspaces.
     */
    fetchTagsWithValues(req, res) {
        const { paths = [], workspaces = [] } = req.body;

        const allWorkspaces = workspaces.includes('*');

        const filtered = tagsWithValues.filter(({ tag }) => {
            const pathMatch = paths.some(
                (p) => tag.path === p || p.endsWith('*')
            );
            const workspaceMatch =
                allWorkspaces ||
                workspaces.includes(tag.workspace) ||
                workspaces.includes(tag.workspace_id);
            return pathMatch && workspaceMatch;
        });

        res.status(200).json({ tagsWithValues: filtered });
    }

    /**
     * POST /nitaghistorian/v2/tags/query-decimated-history
     * Called by HistoricalQueryHandler for each workspace batch.
     *
     * Body: { paths: string[], workspace: string, startTime: string,
     *         endTime: string, decimation: number }
     *
     * Returns only the paths that exist in the mock database for that workspace.
     * Values outside [startTime, endTime] are filtered out.
     */
    queryDecimatedHistory(req, res) {
        const { paths = [], workspace, startTime, endTime } = req.body;

        const start = startTime ? new Date(startTime) : null;
        const end = endTime ? new Date(endTime) : null;

        const workspaceHistory = tagHistory[workspace] || {};
        const results = {};

        for (const path of paths) {
            if (!workspaceHistory[path]) {
                continue;
            }

            const values = workspaceHistory[path].values.filter(({ timestamp }) => {
                const ts = new Date(timestamp);
                return (!start || ts >= start) && (!end || ts <= end);
            });

            results[path] = {
                type: workspaceHistory[path].type,
                values,
            };
        }

        res.status(200).json({ results });
    }
}

export const tagRoutes = new TagRoutes();
