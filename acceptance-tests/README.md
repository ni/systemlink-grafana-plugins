# Acceptance Tests

This directory contains acceptance tests for the NI SystemLink Grafana plugins project.

## Overview

Acceptance tests verify that the plugins work correctly in a real Grafana environment.

## Project Structure

```
tests/
├── datasources/[plugin-name]/    # Tests for data source plugins
├── panels/[plugin-name]/          # Tests for panel plugins
page-objects/                     # Reusable page interaction classes
utils/                            # Shared test utilities and helpers
fake-api/
├── database/db.js                # Mock data definitions
└── routes/                       # Custom API endpoints
```

## Prerequisites

### Build the plugins

From the project root:
```bash
npm run build
```

### Start the test environment

```bash
# From project root
docker-compose -f docker-compose.tests.yaml up -d
```

### Verify services are running

- Grafana: `http://localhost:4000` (admin/admin)
- Fake API health check: `http://localhost:5000/up`

## Running Tests

```bash
# Navigate to acceptance-tests folder
cd acceptance-tests

# Install dependencies (first time only)
npm ci

# Install Playwright browsers (first time only)
npm run playwright:setup

# Run all tests
npm test

# Run tests in headed mode with debugging
npm run test:debug

# Run tests for CI environment
npm run test:ci
```

## Adding New Tests

### Create test files

Create test files in the appropriate folder:
```typescript
// tests/datasources/my-plugin/configuration.spec.ts
import { test, expect } from '@playwright/test';
import { GRAFANA_URL } from '../../../config/environment';

test.describe('My Plugin Configuration', () => {
  test('should save configuration successfully', async ({ page }) => {
    // test implementation
  });
});
```

### Create page objects

```typescript
// page-objects/DataSourceConfigPage.ts
import { Page } from '@playwright/test';

export class DataSourceConfigPage {
  constructor(private page: Page) {}

  async saveAndTest() {
    await this.page.click('button:has-text("Save & test")');
    await this.page.waitForSelector('.alert', { timeout: 10000 });
  }
}
```

### Add mock data

#### Add data to the database
```javascript
// fake-api/database/db.js
export const db = {
  assets: [
    { id: 'asset-1', name: 'Pump A', type: 'equipment', status: 'active' },
    { id: 'asset-2', name: 'Motor B', type: 'equipment', status: 'inactive' }
  ]
};
```

#### Add custom endpoints
```javascript
// fake-api/routes/assets.js
export const getAssetHealth = (req, res) => {
  const { id } = req.params;
  res.json({ assetId: id, status: 'healthy', lastCheck: Date.now() });
};
```

#### Register the route
```javascript
// Add before server.use(router)
server.get('/api/assets/:id/health', getAssetHealth);
```

> **Note**: When configuring data sources in tests, use `http://fake-api:8080` as the URL instead of `http://localhost:5000`. The fake-api service runs on port 8080 inside the Docker network, while port 5000 is only the external mapping for local development access.

## Test Guidelines

- Use descriptive test names that explain the expected behavior
- Create page objects for UI interactions
- Add appropriate mock data to support your test scenarios
