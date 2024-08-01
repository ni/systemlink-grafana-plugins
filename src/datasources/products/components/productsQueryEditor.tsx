import React, { } from 'react';
import { AutoSizeInput, VerticalGroup, InlineFormLabel, InlineSwitch, LoadOptionsCallback, MultiSelect, Select, HorizontalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue, toOption } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { productsDataSource } from '../productsDataSource';
import { ProductsQuery, OrderBy, MetaData } from '../types';
import _ from 'lodash';
import { TestProductsQueryBuilder } from '../QueryBuilder';
import { getTemplateSrv } from '@grafana/runtime';
import { useWorkspaceOptions } from 'core/utils';
import './productsQueryEditor.scss'


type Props = QueryEditorProps<productsDataSource, ProductsQuery>;

export function productsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const workspaces = useWorkspaceOptions(datasource);

  const onMetaDataChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      onChange({ ...query, metaData: items.map(i => i.value as MetaData) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    onChange({ ...query, orderBy: item.value });
    onRunQuery();
  }

  const onQueryByChange = (value: string) => {
    onChange({ ...query, queryBy: value });
    onRunQuery();
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    onChange({ ...query, recordCount: value });
    onRunQuery();
  }

  const onDescendingChange = (isDescendingChecked: boolean) => {
    onChange({ ...query, descending: isDescendingChecked });
    onRunQuery();
  }

  const onWorkspaceChange = (option?: SelectableValue<string>) => {
    onChange({ ...query, workspace: option?.value ?? '' });
    onRunQuery();
  };

  // const handleLoadPartNumberOptions = (query: string, cb?: LoadOptionsCallback<string>) => {
  //   if (!query || query.startsWith('$')) {
  //     return cb?.(getVariableOptions());
  //   }

  //   loadPartNumberOptions(`PART_NUMBER`, query, cb);

  // }

  // const handlePartNumberVariableOptions = (query: string, cb?: LoadOptionsCallback<string>) => {
  //   if (!query || query.startsWith('$')) {
  //     return cb?.(getVariableOptions());
  //   }
  // };

  const getVariableOptions = () => {
    return getTemplateSrv()
      .getVariables()
      .map(v => toOption('$' + v.name));
  };

  // const handlePartNumberChange = (item: SelectableValue<string>) => {
  //   if(!item){
  //     onChange({ ...query, partNumber: item});
  //     onRunQuery();
  //   }
  //   else if (query.partNumber !== item.value) {
  //     onChange({ ...query, partNumber: item.value!});
  //     onRunQuery();
  //   }
  // };

  const handlePartNumberChange = (event: React.FormEvent<HTMLInputElement>) => {
    onChange({ ...query, partNumber: (event.target as HTMLInputElement).value });
    onRunQuery();
  }

  const loadPartNumberOptions = _.debounce((field: string, query: string, cb?: LoadOptionsCallback<string>) => {
    Promise.all([datasource.queryProductValues(field, query)])
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

  const handleFamilyChange = (item: SelectableValue<string>) => {
    if (!item) {
      onChange({ ...query, family: item });
      onRunQuery();
    }
    else if (query.family !== item.value) {
      onChange({ ...query, family: item.value! });
      onRunQuery();
    }
  };

  const handleTagsChange = (tags: string[]) => {
    onChange({ ...query, tags: tags });
  }


  return (
    <>
      <HorizontalGroup spacing='lg' align='flex-start'>
        <VerticalGroup spacing='md'>
          <div>
            <InlineField label="Metadata" labelWidth={20} tooltip={tooltip.metaData}>
              <MultiSelect
                placeholder='Select Metadata'
                options={Object.keys(MetaData).map(value => ({ label: value, value })) as SelectableValue[]}
                onChange={onMetaDataChange}
                value={query.metaData}
                defaultValue={query.metaData!}
                width={40}
                allowCustomValue={true}
                closeMenuOnSelect={false}
              />
            </InlineField>
            <InlineField label="Workspace" labelWidth={20} tooltip={tooltip.workspace}>
              <Select
                isClearable
                isLoading={workspaces.loading}
                onChange={onWorkspaceChange}
                options={workspaces.value}
                placeholder="Any workspace"
                value={query.workspace}
              />
            </InlineField>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <InlineField label="OrderBy" labelWidth={20} tooltip={tooltip.orderBy}>
                <Select
                  options={OrderBy as SelectableValue[]}
                  onChange={onOrderByChange}
                  value={query.orderBy}
                  defaultValue={OrderBy[0]}
                  width={25}
                />
              </InlineField>
              <InlineField label="Descending" tooltip={tooltip.descending}>
                <InlineSwitch
                  onChange={event => onDescendingChange(event.currentTarget.checked)}
                  value={query.descending}
                />
              </InlineField>
            </div>
            <InlineField label="Records to Query" labelWidth={20} tooltip={tooltip.recordCount}>
              <AutoSizeInput
                minWidth={20}
                maxWidth={40}
                defaultValue={query.recordCount}
                onCommitChange={recordCountChange}
              />
            </InlineField>
          </div>
        </VerticalGroup>
        <VerticalGroup spacing='none'>
          <InlineFormLabel>Query By</InlineFormLabel>
          <TestProductsQueryBuilder
            autoComplete={datasource.queryProductValues.bind(datasource)}
            onChange={(event: any) => onQueryByChange(event.detail.linq)}
            defaultValue={query.queryBy}
          />
        </VerticalGroup>
      </HorizontalGroup>


      {/*<InlineField label="Family" labelWidth={20} tooltip={tooltip.family}>
        <Select
          isClearable={true}
          cacheOptions={false}
          defaultOptions
          isValidNewOption={isValidId}
          loadOptions={handleLoadFamilyOptions}
          onChange={handleFamilyChange}
          placeholder="Family"
          value={query.family ? toOption(query.family) : null}
        />
      </InlineField> */}
      {/* <InlineField label="PartNumber" labelWidth={20} tooltip={tooltip.partNumber}> */}
      {/* <Select
          isClearable={true}
          cacheOptions={false}
          defaultOptions
          isValidNewOption={isValidId}
          loadOptions={handleLoadPartNumberOptions}
          onChange={handlePartNumberChange}
          placeholder="Part Number"
          width={30}
          value={query.partNumber ? toOption(query.partNumber) : ''}
        /> */}
      {/* <AutoSizeInput 
          minWidth={30}
          defaultValue={query.partNumber}
          onCommitChange={handlePartNumberChange}
          placeholder="Part Number"
          value={query.partNumber}
        /> */}
      {/* <MultiSelect
          onChange={handlePartNumberChange}
          options={[]}
          placeholder="Part Number"
          value={query.tags}
          allowCustomValue={true}
          maxMenuHeight={0}
          backspaceRemovesValue
          tabSelectsValue
          menuShouldPortal={false}
        /> */}
      {/* <TagsInput
          tags={query.tags}
          onChange={handleTagsChange}
          placeholder="Part Number"/> */}
      {/* </InlineField> */}




    </>
  );
}

const tooltip = {
  partNumber: 'Enter the part number to query',
  family: 'Enter the family name to query',
  workspace: 'Select the workspace to query',
  metaData: 'Select the metadata fields to query',
  queryBy: 'Enter the query to filter the results',
  recordCount: 'Enter the number of records to query',
  orderBy: 'Select the field to order the results by',
  descending: 'Select to order the results in descending order'
}
