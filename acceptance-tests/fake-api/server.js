import jsonServer from 'json-server';

import { db } from './database/db.js';
import { assetRoutes } from './routes/assetRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { systemsRoutes } from './routes/systemsRoutes.js';
import { locationsRoutes } from './routes/locationRoutes.js';

const server = jsonServer.create();
const router = jsonServer.router(db);
const middlewares = jsonServer.defaults();
const port = process.env.PORT;

server.use(jsonServer.bodyParser);
server.use(middlewares);

server.get('/up', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

server.get('/niapm/v1/assets', assetRoutes.listAssets);
server.post('/niapm/v1/query-assets', assetRoutes.queryAssets);

server.get('/niauth/v1/user', authRoutes.getUserWorkspaces);
server.post('/nisysmgmt/v1/query-systems', systemsRoutes.querySystems);
server.get('/nilocation/v1/locations', locationsRoutes.listLocations);

server.use(router);
server.listen(port);

console.log(`Fake API has started on PORT ${port}`);
