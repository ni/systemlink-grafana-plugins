// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';

// Called by @grafana/ui AutoSizeInput
HTMLCanvasElement.prototype.getContext = () => ({
  measureText: (text) => ({ width: text.length * 8 }),
});
