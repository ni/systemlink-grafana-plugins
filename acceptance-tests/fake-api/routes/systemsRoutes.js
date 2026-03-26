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

    querySystems(req, res) {
        const idFilterForFirstSystemFromDb = 'id = "SYSTEM-1"';
        const idFilterForSecondSystemFromDb = 'id = "SYSTEM-2"';
        const scanCodeFilterForFirstSystemFromDb = 'scanCode = "scanCode1"';
        const scanCodeFilterForEighthSystemFromDb = 'scanCode = "scanCode8"';
        const complexFilter = 'id = "SYSTEM-2" && connected.data.state = "Disconnected" || grains.data.minion_blackout.Equals(True)';

        if (req.method !== 'POST') {
            return;
        }

        if (req.body.filter === idFilterForFirstSystemFromDb) {
            res.status(200).json({ count: 1, data: data.filter(data => data.id === 'SYSTEM-1') });
            return;
        }

        if (req.body.filter === idFilterForSecondSystemFromDb) {
            res.status(200).json({ count: 1, data: data.filter(data => data.id === 'SYSTEM-2') });
            return;
        }

        if (req.body.filter === scanCodeFilterForFirstSystemFromDb) {
            res.status(200).json({ count: 1, data: data.filter(data => data.scanCode === 'scanCode1') });
            return;
        }

        if (req.body.filter === scanCodeFilterForEighthSystemFromDb) {
            res.status(200).json({ count: 1, data: data.filter(data => data.scanCode === 'scanCode8') });
            return;
        }

        if (req.body.filter === complexFilter) {
            res.status(200).json({ count: 2, data: data.filter(data => (data.id === 'SYSTEM-2' && data.state === "DISCONNECTED" || data.locked === true)) });
            return;
        }

        res.status(200).json({ count: data.length, data: data });
    }
}
export const systemsRoutes = new SystemsRoutes();
