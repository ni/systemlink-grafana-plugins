import { workspaces } from "../database/workspaces.js";

class AuthRoutes {
    getUserWorkspaces(_req, res) {
        res.status(200).json({
            workspaces,
        });
    }

    authenticate(_req, res) {
        res.status(200).json({
            authenticated: true,
            user: {
                id: 'test-user',
                username: 'testuser'
            }
        });
    }
}
export const authRoutes = new AuthRoutes();
