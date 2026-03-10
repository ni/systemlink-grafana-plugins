import jsonServer from 'json-server';

import { db } from './database/db.js';
import { assetRoutes } from './routes/assetRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { systemsRoutes } from './routes/systemsRoutes.js';
import { locationsRoutes } from './routes/locationRoutes.js';
import { notebookRoutes } from './routes/notebookRoute.js';

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
server.get('/niapm/v1/asset-summary', assetRoutes.getAssetSummary);
server.post('/niapm/v1/assets/calibration-forecast', assetRoutes.getCalibrationForecast);
server.post('/ninbexecution/v1/executions', notebookRoutes.createExecution);
server.get('/ninbexecution/v1/executions/:executionId', notebookRoutes.getExecution);
server.post('/ninbexecution/v1/query-executions', notebookRoutes.queryExecutions);
server.post('/niapp/v1/webapps/query', notebookRoutes.listNotebooks);
server.get('/ninbparser/v1/notebook/:id', notebookRoutes.getNotebookMetadata)
server.get('/niauth/v1/auth', authRoutes.authenticate);

server.use(router);
server.listen(port);

console.log(`Fake API has started on PORT ${port}`);
