import { E2ESelectors } from '@grafana/e2e-selectors';

export const components = {
  assetPlugin: {
    workspace: 'workspace',
    system: 'system'
  },
};

export const selectors: { components: E2ESelectors<typeof components> } = {
  components: components,
};
