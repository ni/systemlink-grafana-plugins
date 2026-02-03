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
            'Workspace': 'workspace',
            'Location': 'location.minionId',
        };

        const filterRegex = /(\w+)\s*(==|!=|=)\s*"([^"]+)"/g;
        const matches = [...filter.matchAll(filterRegex)];

        if (matches.length > 0) {
            const isOrLogic = filter.includes(' || ');

            filteredAssets = db.assets.filter(asset => {
                const checkFunction = isOrLogic ? matches.some : matches.every;

                return checkFunction.call(matches, match => {
                    const [, property, operator, value] = match;
                    const dbField = propertyMap[property] || property;
                    const assetValue = dbField.includes('.')
                        ? dbField.split('.').reduce((obj, key) => obj?.[key], asset)
                        : asset[dbField];

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
            });
        }
    }

    res.json({
        assets: filteredAssets,
        totalCount: filteredAssets.length
    });
});

server.get('/niauth/v1/user', (_req, res) => {
    res.json({
        workspaces: [
            {
                id: 'default-workspace',
                name: 'Default',
                default: true,
                enabled: true
            },
            {
                id: 'workspace-2',
                name: 'Workspace 2',
                default: false,
                enabled: true
            }
        ]
    });
});

server.post('/nisysmgmt/v1/query-systems', (_req, res) => {
    res.json({
        data: [
            {
                alias: 'System-1',
                id: 'SYSTEM-1',
            },
            {
                alias: 'System-2',
                id: 'SYSTEM-2',
            },
            {
                alias: 'System-3',
                id: 'SYSTEM-3',
            }
        ]
    });
});

server.get('/nilocation/v1/locations', (_req, res) => {
    res.json({
        locations: [
            {
                id: 'LOCATION-1',
                name: 'Location 1'
            },
            {
                id: 'LOCATION-2',
                name: 'Location 2'
            },
            {
                id: 'LOCATION-3',
                name: 'Location 3'
            }
        ]
    });
});

server.use(router);
server.listen(port);

console.log(`Fake API has started on PORT ${port}`);
