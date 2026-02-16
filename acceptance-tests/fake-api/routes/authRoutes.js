import { workspaces } from "../database/workspaces.js";

class AuthRoutes {
    getUserWorkspaces(_req, res) {
        res.status(200).json({
            workspaces,
        });
    }
}
export const authRoutes = new AuthRoutes();
