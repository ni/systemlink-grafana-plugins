// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';
import { DataSourceBase } from './src/core/DataSourceBase';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Called by @grafana/ui AutoSizeInput
HTMLCanvasElement.prototype.getContext = () => ({
  measureText: text => ({ width: text.length * 8 }),
});

// Default workspaces for tests
DataSourceBase.Workspaces = [
  { id: '1', name: 'Default workspace' },
  { id: '2', name: 'Other workspace' },
];
