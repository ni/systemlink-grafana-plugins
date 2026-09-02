import React from 'react';
import { QUERY_BUILDER_PLACEHOLDER_WIDTH } from '../../constants/QueryEditor.constants';

// TODO: AB#3923383 - Replace this layout placeholder with the Work Items query builder.
export function WorkItemsQueryBuilder() {
  return (
    <div
      style={{
        width: QUERY_BUILDER_PLACEHOLDER_WIDTH,
      }}
    />
  );
}
