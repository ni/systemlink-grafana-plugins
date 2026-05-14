import { readFileSync } from 'fs';
import { resolve } from 'path';

const GRAFANA_PORT = 4000;
export const GRAFANA_URL = `http://localhost:${GRAFANA_PORT}`;
export const FAKE_API_URL = 'http://fake-api:8080';

const envFile = process.env.NI_ENV ? 'env.ni' : 'env';
const defaultEnvFile = readFileSync(resolve(`../.${envFile}`), 'utf-8');
const versionFromEnv = defaultEnvFile.match(/^GRAFANA_VERSION=(.+)$/m)?.[1]?.trim();
const majorVersionMatch = versionFromEnv?.match(/^v?(\d+)/);
const majorVersion = parseInt(majorVersionMatch[1], 10);
export const GRAFANA_MAJOR_VERSION = majorVersion;
