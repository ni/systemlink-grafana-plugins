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
    const take = parseInt(req.query.take) || 5;
    res.json({
        assets: db.assets.slice(0, take),
        totalCount: db.assets.length
    });
});

server.post('/niapm/v1/query-assets', (req, res) => {
    const take = req.body?.take || 100;
    res.json({
        assets: db.assets.slice(0, take),
        totalCount: db.assets.length
    });
});

server.use(router);
server.listen(port);

console.log(`Fake API has started on PORT ${port}`);
