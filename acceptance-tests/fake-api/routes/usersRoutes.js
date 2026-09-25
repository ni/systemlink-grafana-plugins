import { db } from '../database/db.js';

class UsersRoutes {
    queryUsers(req, res) {
        if (req.method !== 'POST') {
            return;
        }

        res.status(200).json({ users: db.users, totalCount: db.users.length });
    }
}

export const usersRoutes = new UsersRoutes();
