import { ComboboxOption, MultiCombobox } from '@grafana/ui';
import React, { useState } from 'react';

export const AlarmsQueryEditor = () => {
  const flatQueryTypeOptions = [
    { label: 'Column 1', value: 'Column 1' },
    { label: 'Column 2', value: 'Column 2' },
    { label: 'Column 3', value: 'Column 3' },
    { label: 'Column 4', value: 'Column 4' },
  ];

  const queryTypeOptions2: Array<ComboboxOption<string>>= [
    { label: 'Query Type 1', value: 'queryType1' },
    { label: 'Query Type 2', value: 'queryType2' },
    { label: 'Query Type 3', value: 'queryType3' },
  ];

  // Correct state types and handlers
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedQueryType, setSelectedQueryType] = useState<string | undefined>(undefined);

  const args = {
  options: [
    { label: 'Australia', value: 'option1' },
    { label: 'Austria', value: 'option2' },
    { label: 'Fiji', value: 'option3' },
    { label: 'Iceland', value: 'option4' },
    { label: 'Ireland', value: 'option5' },
    { label: 'Finland', value: 'option6' },
    { label: 'The Netherlands', value: 'option7' },
    { label: 'Switzerland', value: 'option8' },
    { label: 'United Kingdom of Great Britain and Northern Ireland ', value: 'option9' },
  ],
  value: 'option2',
  placeholder: 'Select multiple options...',
};

const getOptions = () => {
  if(Math.random()> 0.5) {
    queryTypeOptions2.push({ label: 'Query Type 4', value: 'queryType4' });
  }
  return queryTypeOptions2;
}

  return (
    <MultiCombobox
      options={getOptions()}
      onChange={()=>{}}
      placeholder="Select columns..."
    />
  );
};
