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
            }).length
        });
    }
}

export const assetRoutes = new AssetRoutes();
