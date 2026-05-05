import { db } from '../database/db.js';

class WorkspaceRoutes {
    getUserWorkspaces(_req, res) {
        res.status(200).json({ workspaces: db.workspaces });
    }
}

export const workspaceRoutes = new WorkspaceRoutes();
