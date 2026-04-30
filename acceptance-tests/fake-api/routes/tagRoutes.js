import { tagsWithValues, tagHistory } from '../database/tags.js';

class TagRoutes {
    getTagsCount(_req, res) {
        res.status(200).json({ count: tagsWithValues.length });
    }

    fetchTagsWithValues(req, res) {
        const { paths = [], workspaces = [] } = req.body;

        const allWorkspaces = workspaces.includes('*');

        const filtered = tagsWithValues.filter(({ tag }) => {
            const pathMatch = paths.some((p) => {
                if (p.endsWith('*')) {
                    return tag.path.startsWith(p.slice(0, -1));
                }
                return tag.path === p;
            });
            const workspaceMatch =
                allWorkspaces ||
                workspaces.includes(tag.workspace) ||
                workspaces.includes(tag.workspace_id);
            return pathMatch && workspaceMatch;
        });

        res.status(200).json({ tagsWithValues: filtered });
    }

    queryDecimatedHistory(req, res) {
        const { paths = [], workspace, startTime, endTime, decimation } = req.body;

        const start = startTime ? new Date(startTime) : null;
        const end = endTime ? new Date(endTime) : null;
        const maxPoints = decimation ? Math.min(decimation, 1000) : 500;

        const workspaceHistory = tagHistory[workspace] || {};
        const results = {};

        for (const path of paths) {
            if (!workspaceHistory[path]) {
                continue;
            }

            const values = workspaceHistory[path].values
                .filter(({ timestamp }) => {
                    const ts = new Date(timestamp);
                    return (ts >= start && ts <= end);
                })
                .slice(0, maxPoints);

            results[path] = {
                type: workspaceHistory[path].type,
                values,
            };
        }

        res.status(200).json({ results });
    }
}

export const tagRoutes = new TagRoutes();
