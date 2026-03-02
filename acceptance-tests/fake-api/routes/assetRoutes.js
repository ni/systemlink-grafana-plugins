import { db } from '../database/db.js';

class AssetRoutes {
    listAssets(_req, res) {
        res.status(200).json({
            assets: db.assets,
            totalCount: db.assets.length
        });
    }

    queryAssets(req, res) {
        const idFilterForFirstAssetFromDb = 'AssetIdentifier = "id1"';
        const idFilterForSecondAssetFromDb = 'AssetIdentifier = "id2"';
        const scanCodeFilterForFirstAssetFromDb = 'ScanCode = "scanCode1"';
        const scanCodeFilterForSixthAssetFromDb = 'ScanCode = "scanCode6"';

        if (req.method !== 'POST') {
            return;
        }

        if (req.body.filter === idFilterForFirstAssetFromDb) {
            res.status(200).json({ assets: db.assets.filter(asset => asset.id === 'id1'), totalCount: 1 });
            return;
        }

        if (req.body.filter === idFilterForSecondAssetFromDb) {
            res.status(200).json({ assets: db.assets.filter(asset => asset.id === 'id2'), totalCount: 1 });
            return;
        }

        if (req.body.filter === scanCodeFilterForFirstAssetFromDb) {
            res.status(200).json({ assets: db.assets.filter(asset => asset.scanCode === 'scanCode1'), totalCount: 1 });
            return;
        }

        if (req.body.filter === scanCodeFilterForSixthAssetFromDb) {
            res.status(200).json({ assets: db.assets.filter(asset => asset.scanCode === 'scanCode6'), totalCount: 1 });
            return;
        }

        res.status(200).json({ assets: db.assets, totalCount: db.assets.length });
    }

    getAssetSummary(_req, res) {
        const now = new Date('2026-02-13T00:00:00.000Z');
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const totalCount = db.assets.length;
        const activeCount = db.assets.filter(asset =>
            asset.location?.state?.assetPresence === 'PRESENT' &&
            asset.location?.state?.systemConnection === 'CONNECTED'
        ).length;

        res.status(200).json({
            total: totalCount,
            active: activeCount,
            notActive: totalCount - activeCount,
            approachingRecommendedDueDate: db.assets.filter(asset => {
                if (!asset.externalCalibration?.resolvedDueDate) {
                    return false;
                }
                const dueDate = new Date(asset.externalCalibration.resolvedDueDate);
                return dueDate >= now && dueDate < thirtyDaysFromNow;
            }).length,
            pastRecommendedDueDate: db.assets.filter(asset => {
                if (!asset.externalCalibration?.resolvedDueDate) {
                    return false;
                }
                const dueDate = new Date(asset.externalCalibration.resolvedDueDate);
                return dueDate < now;
            }).length,
            outForCalibration: db.assets.filter(asset =>
                asset.outForCalibration === true,
            ).length
        });
    }

    getCalibrationForecast(req, res) {
        if (req.method !== 'POST') {
            return;
        }

        const { groupBy, startTime, endTime, filter } = req.body;
        const start = new Date(startTime);
        const end = new Date(endTime);

        let filteredAssets = db.assets;

        if (filter) {
            if (filter.includes('DEVICE_UNDER_TEST') || filter.includes('Device under test')) {
                filteredAssets = filteredAssets.filter(asset => asset.assetType === 'DEVICE_UNDER_TEST');
            }
        }

        const assetsInRange = filteredAssets.filter(asset => {
            if (!asset.externalCalibration?.resolvedDueDate) {
                return false;
            }
            const dueDate = new Date(asset.externalCalibration.resolvedDueDate);
            return dueDate >= start && dueDate <= end;
        });

        let columns = [];
        if (groupBy.includes('MONTH')) {
            const monthMap = new Map();

            let currentDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
            const endDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

            while (currentDate <= endDate) {
                const monthKey = currentDate.toISOString();
                monthMap.set(monthKey, 0);

                currentDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1));
            }

            assetsInRange.forEach(asset => {
                const dueDate = new Date(asset.externalCalibration.resolvedDueDate);

                const monthKey = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), 1)).toISOString();

                monthMap.set(monthKey, monthMap.get(monthKey) + 1);
            });

            const months = Array.from(monthMap.keys()).sort();
            const counts = months.map(month => monthMap.get(month));

            columns = [
                {
                    name: 'Month',
                    columnDescriptors: [{ type: 'TIME', value: 'Month' }],
                    values: months
                },
                {
                    name: 'Assets',
                    columnDescriptors: [{ type: 'COUNT', value: 'Assets' }],
                    values: counts
                }
            ];
        }

        res.status(200).json({
            calibrationForecast: {
                columns: columns
            }
        });
    }
}

export const assetRoutes = new AssetRoutes();
