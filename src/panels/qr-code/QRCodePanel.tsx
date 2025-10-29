import React from 'react';
import { PanelProps } from '@grafana/data';
import { QRCodePanelOptions } from './types';
import { css, cx } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';

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


/**
 * QRCodePanel is a Grafana panel plugin that generates QR codes from static text or dynamic dashboard variables.
 * 
 * The panel supports Grafana's variable substitution system, allowing users to create QR codes that update
 * automatically when dashboard variables change. The QR code is rendered with a white background and scales
 * to fit the panel dimensions.
 * 
 * @param options - Panel configuration options containing the value to encode
 * @param width - Panel width in pixels
 * @param height - Panel height in pixels  
 * @param replaceVariables - Grafana function to resolve dashboard variables
 */
export const QRCodePanel: React.FC<Props> = ({ options, width, height, replaceVariables }) => {
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
