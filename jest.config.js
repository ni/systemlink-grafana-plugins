// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

const { grafanaESModules, nodeModulesToTransform } = require('./.config/jest/utils');

module.exports = {
  // Jest configuration provided by Grafana scaffolding
  ...require('./.config/jest.config'),
  // Clear mocks before every test
  clearMocks: true,
  // Add ESM-only packages to the transform list
  transformIgnorePatterns: [nodeModulesToTransform([...grafanaESModules, 'marked', 'react-calendar', 'get-user-locale', 'memoize', '@wojtekmaj/date-utils', 'mimic-function'])],
};
