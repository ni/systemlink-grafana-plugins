import React, { useMemo } from 'react';
import { useTheme2 } from '@grafana/ui';
import QueryBuilder, { QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import 'smart-webcomponents-react/source/styles/smart.dark-orange.css';
import 'smart-webcomponents-react/source/styles/smart.orange.css';
import 'smart-webcomponents-react/source/styles/components/smart.base.css';
import 'smart-webcomponents-react/source/styles/components/smart.common.css';
import 'smart-webcomponents-react/source/styles/components/smart.querybuilder.css';
import './QueryBuilderWrapper.css';
import { filterXSSLINQExpression } from 'core/utils';

type QueryBuilderWrapperProps = QueryBuilderProps & React.HTMLAttributes<Element> & {
    filter?: string;
  };

/**
 * QueryBuilderWrapper is a React functional component that wraps the QueryBuilder component.
 * It provides additional functionality such as theme-based styling and filter sanitization.
 *
 * @param {QueryBuilderWrapperProps} props - The props for the QueryBuilderWrapper component.
 * @param {CustomOperations} props.customOperations - Custom operations to be used in the QueryBuilder.
 * @param {Field[]} props.fields - The fields available for building queries.
 * @param {Messages} props.messages - Custom messages for the QueryBuilder UI.
 * @param {(filter: Filter) => void} props.onChange - Callback function triggered when the filter changes.
 * @param {Filter} props.filter - The initial filter value to be used in the QueryBuilder.
 * @param {boolean} props.showIcons - Determines whether icons should be displayed in the QueryBuilder.
 *
 * @returns {JSX.Element} The rendered QueryBuilder component with additional functionality.
 */
export const QueryBuilderWrapper: React.FC<QueryBuilderWrapperProps> = ({
  customOperations,
  fields,
  messages,
  onChange,
  filter,
  showIcons,
}) => {
  const theme = useTheme2();
  document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');

  const sanitizedFilter = useMemo(() => {
    return filterXSSLINQExpression(filter);
  }, [filter]);

  return (
    <QueryBuilder
      customOperations={customOperations}
      fields={fields}
      messages={messages}
      onChange={onChange}
      value={sanitizedFilter}
      showIcons={showIcons}
    />
  );
};
