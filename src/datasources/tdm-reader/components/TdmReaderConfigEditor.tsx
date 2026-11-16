import React from 'react';
import { Alert } from '@grafana/ui';

export function TdmReaderConfigEditor() {
  return (
    <Alert title="SystemLink TDM Reader mockup" severity="info">
      This data source uses built-in mock files and channels. No URL, credentials, or SystemLink connection is required.
      Save &amp; test checks mock readiness only. Use a Table visualization to display selected channel samples.
    </Alert>
  );
}
