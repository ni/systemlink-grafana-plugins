import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';
import { queryBuilderMessages } from 'core/query-builder.constants';
import React from 'react';

export const AlarmsQueryBuilder = () => {
  return <SlQueryBuilder
  customOperations={[]}
              fields={[]}
              messages={queryBuilderMessages}
              onChange={() => {}}
              value={''}
  ></SlQueryBuilder>;
};
