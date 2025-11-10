import { PanelPlugin } from '@grafana/data';
import { QRCodePanel } from './QRCodePanel';
import { QRCodePanelOptions } from './types';

export const plugin = new PanelPlugin<QRCodePanelOptions>(QRCodePanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'value',
      name: 'Value',
      description: 'Value that will be rendered as a QR code',
      defaultValue: 'https://ni.com'
    })
});
