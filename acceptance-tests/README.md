# Acceptance Tests

This directory contains acceptance tests for the NI SystemLink Grafana plugins.

## Overview

Acceptance tests verify that the plugins work correctly in a real Grafana environment.

## Prerequisites

Run `docker-compose.tests.yaml` from project root. This will start a Grafana instance used for testing and an API that will be used to mock data.

## Running Tests

```bash
# in acceptance-tests folder
npm install
npm run playwright:setup # if not ran before
npm test
```

## Writing Tests

Follow the existing test patterns and structure when adding new acceptance tests.
