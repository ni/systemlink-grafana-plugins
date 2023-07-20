import React, { ChangeEvent } from 'react';
import { InlineField, InlineSwitch, Input, MultiSelect } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onBlur, onChange, onRunQuery }: Props) {
  const options = [
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
    { label: 'Mean', value: 'mean' },
    { label: 'Count', value: 'count' },
  ];

  // const [start_date, setStartDate] = useState<DateTime>(dateTime('2021-05-05 12:00:00'));
  // const [end_date, setEndDate] = useState<DateTime>(dateTime('2021-05-05 12:00:00'));
  // query.startDate = start_date;
  // query.endDate = end_date;

  const onTagPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, TagPath: event.target.value });
  };

  // Why cant this be a number? if I change take to a number type in the types doc it throws an error
  // const onCountChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   onChange({ ...query, take: event.target.value });
  // };

  const handleAggChange = (items: Array<SelectableValue<string>>) => {
    onChange({ ...query, aggregates: items.map(item => item.value!)})
    onRunQuery();
  };

  const handleTagHistorySwitch = () => {
    onChange({ ...query, tagHistory: !query.tagHistory})
    onRunQuery();
  };

  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="TagPath" labelWidth={16} tooltip="Enter Path for desired tag">
        <Input width={75} onChange={onTagPathChange} onBlur={onRunQuery} value={query.TagPath || ''} />
      </InlineField>
      <InlineField label="Aggregates">
        <MultiSelect options={options} value={query.aggregates} onChange={handleAggChange} />
      </InlineField>

      <InlineField
        label="Enable Historian Service"
        tooltip="Note: The tag historian service is not always up to date with the most current value"
      >
        <InlineSwitch value={query.tagHistory} onChange={handleTagHistorySwitch}></InlineSwitch>
      </InlineField>
      {/* <InlineField>
        <DateTimePicker label="Start Date" date={start_date} onChange={setStartDate} />
      </InlineField>
      <InlineField>
        <DateTimePicker label="End Date" date={end_date} onChange={setEndDate} />
      </InlineField> */}

      {/* <InlineField label="Count" tooltip={'Number of Data points that will be retrieved'}>
        <Input onChange={onCountChange} value={query.take} onBlur={onRunQuery} />
      </InlineField> */}
    </div>
  );
}
