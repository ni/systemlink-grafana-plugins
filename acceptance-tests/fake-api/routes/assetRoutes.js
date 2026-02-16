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
}

export const assetRoutes = new AssetRoutes();
