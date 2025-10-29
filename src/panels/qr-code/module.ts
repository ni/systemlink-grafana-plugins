import { PanelPlugin } from '@grafana/data';
import { QRCodePanel } from './QRCodePanel';
import { QRCodePanelOptions } from './types';

export const plugin = new PanelPlugin<QRCodePanelOptions>(QRCodePanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'value',
      name: 'Value',
      description: 'Value the QR code will encode',
      defaultValue: 'https://ni.com'
    })
});
