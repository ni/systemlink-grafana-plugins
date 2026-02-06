import { db } from '../database/db.js';

class AssetRoutes {
    listAssets(_req, res) {
        res.status(200).json({
            assets: db.assets,
            totalCount: db.assets.length
        });
    }

    queryAssets(req, res) {
        const idFilterForFirstAssetFromDb = 'AssetIdentifier = "c44750b7-1f22-4fec-b475-73b10e966217"';
        const idFilterForSecondAssetFromDb = 'AssetIdentifier = "4aa6c0de-c256-4f5b-9d7f-0e2d3aa20edc"';
        const scanCodeFilterForFirstAssetFromDb = 'ScanCode = "c44750b7-1f22-4fec-b475-73b10e966217"';
        const scanCodeFilterForSixthAssetFromDb = 'ScanCode = "1b5c6cfa-2c89-4f12-894b-c07106c04848"';

        if (req.method === 'POST') {
            if (req.body.filter === idFilterForFirstAssetFromDb) {
                res.status(200).json({ assets: db.assets.filter(asset => asset.id === 'c44750b7-1f22-4fec-b475-73b10e966217'), totalCount: 1 });
            } else if (req.body.filter === idFilterForSecondAssetFromDb) {
                res.status(200).json({ assets: db.assets.filter(asset => asset.id === '4aa6c0de-c256-4f5b-9d7f-0e2d3aa20edc'), totalCount: 1 });
            } else if (req.body.filter === scanCodeFilterForFirstAssetFromDb) {
                res.status(200).json({ assets: db.assets.filter(asset => asset.scanCode === 'c44750b7-1f22-4fec-b475-73b10e966217'), totalCount: 1 });
            } else if (req.body.filter === scanCodeFilterForSixthAssetFromDb) {
                res.status(200).json({ assets: db.assets.filter(asset => asset.scanCode === '1b5c6cfa-2c89-4f12-894b-c07106c04848'), totalCount: 1 });
            } else {
                res.status(200).json({ assets: db.assets, totalCount: db.assets.length });
            }
        }
    }
}

export const assetRoutes = new AssetRoutes();
