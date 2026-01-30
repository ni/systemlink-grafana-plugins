import jsonServer from 'json-server';

import { db } from './database/db.js';

const server = jsonServer.create();
const router = jsonServer.router(db);
const middlewares = jsonServer.defaults();
const port = process.env.PORT;

server.use(jsonServer.bodyParser);
server.use(middlewares);
server.get('/up', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

server.get('/niapm/v1/assets', (req, res) => {
    res.json({
        assets: db.assets,
        totalCount: db.assets.length
    });
});

server.post('/niapm/v1/query-assets', (req, res) => {
    const filter = req.body.filter;
    let filteredAssets = db.assets;

    if (filter) {
        const propertyMap = {
            'AssetIdentifier': 'id',
            'ScanCode': 'scanCode',
        };

        const match = filter.match(/(\w+)\s*(==|!=|=)\s*"([^"]+)"/);

        if (match) {
            const [, property, operator, value] = match;

            const dbField = propertyMap[property] || property;

            filteredAssets = db.assets.filter(asset => {
                const assetValue = asset[dbField];

                switch (operator) {
                    case '=':
                    case '==':
                        return assetValue === value;

                    case '!=':
                        return assetValue !== value;

                    default:
                        return true;
                }
            });
        }
    }

    res.json({
        assets: filteredAssets,
        totalCount: filteredAssets.length
    });
});

server.use(router);
server.listen(port);

console.log(`Fake API has started on PORT ${port}`);
