import { SelectableValue } from '@grafana/data';
import {
  AutoSizeInput,
  InlineField,
  InlineSwitch,
  MultiSelect,
  RadioButtonGroup,
  Select,
  VerticalGroup,
} from '@grafana/ui';
import { enumToOptions, validateNumericInput } from 'core/utils';
import React from 'react';
import '../../ResultsQueryEditor.scss';
import { OutputType } from 'datasources/results/types/types';
import { TimeRangeControls } from '../time-range/TimeRangeControls';
import { OrderBy, QuerySteps, StepsProperties } from 'datasources/results/types/QuerySteps.types';

type Props = {
  query: QuerySteps;
  handleQueryChange: (query: QuerySteps, runQuery?: boolean) => void;
};

export function QueryStepsEditor({ query, handleQueryChange }: Props) {
  const onOutputChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value as StepsProperties) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, recordCount: value });
  };

  return (
    <>
      <VerticalGroup>
        <InlineField label="Output" labelWidth={25}>
          <RadioButtonGroup
            options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
            value={query.outputType}
            onChange={onOutputChange}
          />
        </InlineField>
        {query.outputType === OutputType.Data && (
          <VerticalGroup>
            <InlineField label="Properties" labelWidth={25}>
              <MultiSelect
                placeholder="Select properties to fetch"
                options={enumToOptions(StepsProperties)}
                onChange={onPropertiesChange}
                value={query.properties}
                defaultValue={query.properties!}
                noMultiValueWrap={true}
                maxVisibleValues={5}
                width={60}
                allowCustomValue={false}
                closeMenuOnSelect={false}
              />
            </InlineField>
            <div>
              <div className="horizontal-control-group">
                <InlineField label="OrderBy" labelWidth={25}>
                  <Select
                    options={OrderBy as SelectableValue[]}
                    placeholder="Select field to order by"
                    onChange={onOrderByChange}
                    value={query.orderBy}
                    defaultValue={query.orderBy}
                  />
                </InlineField>
                <InlineField label="Descending">
                  <InlineSwitch
                    onChange={event => onDescendingChange(event.currentTarget.checked)}
                    value={query.descending}
                  />
                </InlineField>
              </div>
              <InlineField label="Take" labelWidth={25}>
                <AutoSizeInput
                  minWidth={20}
                  maxWidth={40}
                  type="number"
                  defaultValue={query.recordCount}
                  onCommitChange={recordCountChange}
                  placeholder="Enter record count"
                  onKeyDown={(event) => {validateNumericInput(event)}}
                />
              </InlineField>
              <TimeRangeControls
                query={query}
                handleQueryChange={(updatedQuery, runQuery) => {
                  handleQueryChange(updatedQuery as QuerySteps, runQuery);
                }}
              />
            </div>
          </VerticalGroup>
        )}
        {query.outputType === OutputType.TotalCount && (
          <TimeRangeControls
            query={query}
            handleQueryChange={(updatedQuery, runQuery) => {
              handleQueryChange(updatedQuery as QuerySteps, runQuery);
            }}
          />
        )}
      </VerticalGroup>
    </>
  );
}
