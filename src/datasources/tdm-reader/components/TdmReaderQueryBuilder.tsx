import React from 'react';
import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';
import { TdmFilter } from '../types';

const fields: QBField[] = [
  {
    label: 'File ID',
    dataField: 'fileId',
    dataType: 'string',
    filterOperations: [QueryBuilderOperations.EQUALS.name],
  },
  {
    label: 'File Name',
    dataField: 'fileName',
    dataType: 'string',
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
];

const operations = [
  { ...QueryBuilderOperations.EQUALS, label: 'Equals' },
  { ...QueryBuilderOperations.DOES_NOT_EQUAL, label: 'Does not equal' },
];

interface Props {
  filter: TdmFilter;
  onChange: (value: unknown) => void;
}

export function TdmReaderQueryBuilder({ filter, onChange }: Props) {
  return (
    <SlQueryBuilder
      fields={fields}
      customOperations={operations}
      messages={queryBuilderMessages}
      value={filter}
      onChange={event => {
        if (event instanceof CustomEvent && event.detail && 'value' in event.detail) {
          onChange(event.detail.value);
        }
      }}
    />
  );
}
