import { data } from '../database/systems.js';

class SystemsRoutes {
    getSystemsSummary(_req, res) {
        const connectedCount = data.filter(system =>
            system.state === "CONNECTED" ||
            system.state === "CONNECTED_REFRESH_PENDING" ||
            system.state === "CONNECTED_REFRESH_FAILED"
        ).length;

        const disconnectedCount = data.filter(system =>
            system.state === "DISCONNECTED" ||
            system.state === "APPROVED" ||
            system.state === "ACTIVATED_WITHOUT_CONNECTION"
        ).length;

        const virtualCount = data.filter(system =>
            system.state === "VIRTUAL"
        ).length;

        res.status(200).json({
            connectedCount: connectedCount,
            disconnectedCount: disconnectedCount,
            virtualCount: virtualCount,
        });
    }

    querySystems(_req, res) {
        res.status(200).json({
            data
        });
    }
}
export const systemsRoutes = new SystemsRoutes();
