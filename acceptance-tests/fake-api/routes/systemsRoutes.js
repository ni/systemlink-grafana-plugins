import { data } from '../database/systems.js';

class SystemsRoutes {
    querySystems(_req, res) {
        res.status(200).json({
            data
        });
    }
}
export const systemsRoutes = new SystemsRoutes();
