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

server.get('/niapm/v1/assets', (_req, res) => {
    res.json({
        assets: db.assets,
        totalCount: db.assets.length
    });
});

server.use(router);
server.listen(port);

console.log(`Fake API has started on PORT ${port}`);
