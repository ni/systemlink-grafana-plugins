import { InlineField as GfInlineField } from '@grafana/ui';
import _ from 'lodash';
import React, { useMemo } from 'react';

/** Wrapper around InlineField that applies a unique ID to the form input.
 * This ensures that the label is linked with the "for" attribute.  */
export function InlineField(props: Parameters<typeof GfInlineField>[0]) {
  const id = useMemo(() => _.uniqueId('sl'), []);
  return <GfInlineField {...props}>{React.cloneElement(props.children, { id })}</GfInlineField>;
}
