import React, { useRef, useEffect } from 'react';
import { QueryBuilder, QueryBuilderField, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import { useTheme2 } from '@grafana/ui';

import 'smart-webcomponents-react/source/styles/smart.dark-orange.css';
import 'smart-webcomponents-react/source/styles/smart.orange.css';
import 'smart-webcomponents-react/source/styles/components/smart.base.css';
import 'smart-webcomponents-react/source/styles/components/smart.common.css';
import 'smart-webcomponents-react/source/styles/components/smart.querybuilder.css';
import { customOperations, getDynamicField, messages } from './queryBuilderConstants';


type TestMonitorQueryBuilderProps = Omit<QueryBuilderProps, 'customOperations' | 'fields' | 'messages' | 'showIcons'> &
  React.HTMLAttributes<Element> & {
    defaultValue?: string;
    fields?: QueryBuilderField[];
  };

export const TestMonitorQueryBuilder: React.FC<TestMonitorQueryBuilderProps> = (props) => {
  const theme = useTheme2();
  // Need to set on body to affect dropdowns
  document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');

  const initialize = useRef(true);
  useEffect(() => {
    initialize.current = false;
  }, []);

//   const customOperations = new QueryBuilderCustomProperties();

  return (
    <QueryBuilder
      customOperations={customOperations}
      getDynamicField={getDynamicField}
      fields={props.fields}
      messages={messages}
      showIcons
      // Only set value on first render
      {...(initialize.current && { value: props.defaultValue })}
      {...props}
    />
  );
};

