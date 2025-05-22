import React, { useMemo } from 'react';
import { useTheme2 } from '@grafana/ui';
import QueryBuilder, { QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import './SlQueryBuilder.css';
import { filterXSSLINQExpression } from 'core/utils';

type SlQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    validateOnInput?: boolean;
  };

/**
 * SlQueryBuilder is a React functional component that wraps the QueryBuilder component.
 * It provides additional functionality such as theme-based styling and filter sanitization.
 *
 * @param {SlQueryBuilderProps} props - The props for the SlQueryBuilder component.
 * @param {CustomOperations} props.customOperations - Custom operations to be used in the QueryBuilder.
 * @param {Field[]} props.fields - The fields available for building queries.
 * @param {Messages} props.messages - Custom messages for the QueryBuilder UI.
 * @param {(filter: Filter) => void} props.onChange - Callback function triggered when the filter changes.
 * @param {Filter} props.filter - The initial filter value to be used in the QueryBuilder.
 * @param {boolean} props.showIcons - Determines whether icons should be displayed in the QueryBuilder.
 *
 * @returns {JSX.Element} The rendered QueryBuilder component with additional functionality.
 */
export const SlQueryBuilder: React.FC<SlQueryBuilderProps> = ({
  customOperations,
  fields,
  messages,
  onChange,
  value,
  showIcons,
  validateOnInput = false,
}) => {
  const theme = useTheme2();

  const sanitizedFilter = useMemo(() => {
    return filterXSSLINQExpression(value);
  }, [value]);

  return (
    <div
      className="sl-query-builder"
      style={
        {
          '--ni-grafana-background-canvas': theme.colors.background.canvas,
          '--ni-grafana-text-primary': theme.colors.text.primary,
          '--ni-grafana-border-medium': theme.colors.border.medium,
          '--ni-grafana-focus-color': theme.colors.action.focus,
          '--ni-grafana-active-color': theme.colors.action.selected,
          '--ni-grafana-border-radius-default': theme.shape.radius.default,
        } as React.CSSProperties
      }
    >
      <QueryBuilder
        customOperations={customOperations}
        fields={fields}
        messages={messages}
        onChange={onChange}
        value={sanitizedFilter}
        validateOnInput={validateOnInput}
        showIcons={showIcons}
      />
    </div>
  );
};
