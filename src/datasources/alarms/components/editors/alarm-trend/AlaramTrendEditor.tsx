import React from 'react';

import { InlineField, InlineSwitch } from '@grafana/ui';

export function AlarmsTrendEditor() {
  return (
    <InlineField label="Group By Severity" tooltip={'Group by severity'}>
      <InlineSwitch value={true} />
    </InlineField>
  );
}
