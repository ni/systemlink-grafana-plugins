import { SelectableValue, toOption } from "@grafana/data";
import { InlineField, LoadOptionsCallback, Select } from "@grafana/ui";
import React from "react";
import { isValidId } from "../utils";
import { ProductsVariableQuery } from "../types";
import { productsDataSource } from "../productsDataSource";
import { getTemplateSrv } from "@grafana/runtime";
import _ from "lodash";
import { useWorkspaceOptions } from "core/utils";
import { TestMonitorQueryBuilder } from "shared/queryBuilder";


interface Props {
  query: ProductsVariableQuery;
  onChange: (query: ProductsVariableQuery) => void;
  datasource: productsDataSource;
}

export function ProductsVariableQueryEditor({ onChange, query, datasource }: Props) {
  const workspaces = useWorkspaceOptions(datasource);

  // const loadPartNumberOptions = _.debounce((field: string, query: string, cb?: LoadOptionsCallback<string>) => {
  //   Promise.all([datasource.queryProductValues(field, query )])
  //     .then(([partNumbers]) =>
  //     cb?.(
  //       partNumbers.map(partNumber => ({
  //         label: partNumber,
  //         value: partNumber,
  //         title: partNumber,
  //       }))
  //     )
  //   )
  // }, 300);

  // const handleLoadFamilyOptions = (query: string, cb?: LoadOptionsCallback<string>) => {
  //   if (!query || query.startsWith('$')) {
  //     return cb?.(getVariableOptions());
  //   }

  //   loadPartNumberOptions('FAMILY', query, cb);

  // };

  const getVariableOptions = () => {
    return getTemplateSrv()
      .getVariables()
      .map(v => toOption('$' + v.name));
  };

  // const handleFamilyChange = (item: SelectableValue<string>) => {
  //   if(!item){
  //     onChange({ ...query, family: item});
  //   }
  //   else if (query.family !== item.value) {
  //     onChange({ ...query, family: item.value!});
  //   }
  // };

  const getDataSource = (field: string) => {
    return async (query: string, callback: Function) => {
      callback(await datasource.queryProductValues(field, query));
    };
  };

  const onQueryByChange = (value: string) => {
    onChange({ ...query, queryBy: value });
  };

  const fields = [
    {
      label: 'Part Number',
      dataField: 'partNumber',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank',],
      lookup: { dataSource: getDataSource('PART_NUMBER'), minLength: 1 },
    },
    {
      label: 'Family',
      dataField: 'family',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('FAMILY'), minLength: 1 },
    },
    {
      label: 'Name',
      dataField: 'name',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('NAME'), minLength: 1 },
    },
    {
      label: 'Properties',
      dataField: 'properties',
      dataType: 'Object',
      filterOperations: ['key_value_matches'],
    },
    {
      label: 'Updated at',
      dataField: 'updatedAt',
      dataType: 'string',
      filterOperations: ['>', '>=', '<', '<='],
      lookup: {
        dataSource: [
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'From (YYYY-MM-DD)', value: '${__from:date:YYYY-MM-DD}' },
          { label: 'To (YYYY-MM-DD)', value: '${__to:date:YYYY-MM-DD}' },
        ],
      },
    },
    {
      label: 'Workspace',
      dataField: 'workspace',
      dataType: 'string',
      filterOperations: ['=', '<>'],
      lookup: { dataSource: workspaces },
    },
  ];

  return (
    <>
      <InlineField label='Query By' labelWidth={20} tooltip={tooltip.queryBy}>
        <TestMonitorQueryBuilder
          onChange={(event: any) => onQueryByChange(event.detail.linq)}
          defaultValue={query.queryBy}
          fields={fields}
        />
      </InlineField>
    </>
  );
};

const tooltip = {
  queryBy: 'Enter the query to filter the results',
}
