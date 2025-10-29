import React from 'react';
import { PanelProps } from '@grafana/data';
import { QRCodePanelOptions } from './types';
import { css, cx } from '@emotion/css';
import { useStyles2} from '@grafana/ui';

import QRCode from "react-qr-code";

interface Props extends PanelProps<QRCodePanelOptions> { }

const getStyles = () => {
  return {
    wrapper: css`
      font-family: Open Sans;
      position: relative;
    `,
    svg: css`
      position: absolute;
      top: 0;
      left: 0;
    `,
    textBox: css`
      position: absolute;
      bottom: 0;
      left: 0;
      padding: 10px;
    `,
    qrContainer: css`
      background: white;
      padding: 16px;
      width: 100%;
      height: 100%;
    `,
  };
};

export const QRCodePanel: React.FC<Props> = ({ options, width, height, replaceVariables}) => {

  const styles = useStyles2(getStyles);

  let qrCodeValue = replaceVariables(options.value);

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
      width: ${width}px;
      height: ${height}px;
    `
      )}
    >
      <div className={styles.qrContainer}>
        <QRCode data-testid="qrcode-code" style={{ height: "100%", width: "100%" }}
          value={qrCodeValue} />
      </div>
    </div>
  );
};
