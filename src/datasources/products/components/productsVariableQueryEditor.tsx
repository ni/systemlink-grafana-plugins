import { SelectableValue, toOption } from "@grafana/data";
import { InlineField, LoadOptionsCallback, Select } from "@grafana/ui";
import React from "react";
import { isValidId } from "../utils";
import { ProductsVariableQuery } from "../types";
import { productsDataSource } from "../productsDataSource";
import { getTemplateSrv } from "@grafana/runtime";
import _ from "lodash";
import { useWorkspaceOptions } from "core/utils";


interface Props {
  query: ProductsVariableQuery;
  onChange: (query: ProductsVariableQuery) => void;
  datasource: productsDataSource;
}

export function ProductsVariableQueryEditor({ onChange, query, datasource}: Props) {
  const workspaces = useWorkspaceOptions(datasource);

  const loadPartNumberOptions = _.debounce((field: string, query: string, cb?: LoadOptionsCallback<string>) => {
    Promise.all([datasource.queryProductValues(field, query )])
      .then(([partNumbers]) =>
      cb?.(
        partNumbers.map(partNumber => ({
          label: partNumber,
          value: partNumber,
          title: partNumber,
        }))
      )
    )
  }, 300);

  const handleLoadFamilyOptions = (query: string, cb?: LoadOptionsCallback<string>) => {
    if (!query || query.startsWith('$')) {
      return cb?.(getVariableOptions());
    }

    loadPartNumberOptions('FAMILY', query, cb);

  };

  const getVariableOptions = () => {
    return getTemplateSrv()
      .getVariables()
      .map(v => toOption('$' + v.name));
  };

  const handleFamilyChange = (item: SelectableValue<string>) => {
    if(!item){
      onChange({ ...query, family: item});
    }
    else if (query.family !== item.value) {
      onChange({ ...query, family: item.value!});
    }
  };
  
  return (
    <>
      <InlineField label="Family" labelWidth={20} tooltip={tooltip.family}>
        <Select
          isClearable={true}
          cacheOptions={false}
          defaultOptions
          isValidNewOption={isValidId}
          loadOptions={handleLoadFamilyOptions}
          onChange={handleFamilyChange}
          placeholder="Family"
          width={30}
          value={query.family ? toOption(query.family) : null} />
      </InlineField>
      <InlineField label="Workspace" labelWidth={20} tooltip={tooltip.workspace}>
          <Select
            isClearable
            isLoading={workspaces.loading}
            onChange={(option?: SelectableValue<string>) => onChange({ ...query, workspace: option?.value ?? '' })}
            options={workspaces.value}
            placeholder="Any workspace"
            value={query.workspace} />
      </InlineField>
    </>
  );
};

const tooltip = {
  family: 'Enter the family name to query',
  workspace: 'Select the workspace to query',
}
