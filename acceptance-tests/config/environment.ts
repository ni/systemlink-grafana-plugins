import { readFileSync } from 'fs';
import { resolve } from 'path';

const GRAFANA_PORT = 4000;
export const GRAFANA_URL = `http://localhost:${GRAFANA_PORT}`;
export const FAKE_API_URL = 'http://fake-api:8080';

const composeFile = readFileSync(resolve('../docker-compose.tests.yaml'), 'utf-8');
const versionMatch = composeFile.match(/grafana_version:\s*\$\{GRAFANA_VERSION:-(\d+)/);
export const GRAFANA_MAJOR_VERSION = parseInt(versionMatch![1], 10);
