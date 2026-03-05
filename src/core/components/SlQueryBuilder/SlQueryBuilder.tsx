import React, { useEffect, useMemo } from 'react';
import { useTheme2 } from '@grafana/ui';
import QueryBuilder, { QueryBuilderField, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import './SlQueryBuilder.scss';
import { filterXSSLINQExpression } from 'core/utils';
import { QBField } from 'core/types';

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
 * @param {QBField[]} props.fields - The fields available for building queries.
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
  disabled = false,
  validateOnInput = false,
}) => {
  const theme = useTheme2();
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const isInitializedRef = React.useRef(false);
  const isLegacyFilter = !Array.isArray(value);

  const getQueryBuilderInstance = React.useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return null;
    }

    const queryBuilderElement = wrapper.querySelector('smart-query-builder') as any;
    return queryBuilderElement;
  }, []);

  useEffect(() => {
    document.body.style.setProperty('--ni-grafana-input-background', theme.components.input.background);
    document.body.style.setProperty('--ni-grafana-text-primary', theme.colors.text.primary);
    document.body.style.setProperty('--ni-grafana-border-medium', theme.colors.border.medium);
    document.body.style.setProperty('--ni-grafana-focus-color', theme.colors.action.focus);
    document.body.style.setProperty('--ni-grafana-active-color', theme.colors.action.selected);
    document.body.style.setProperty('--ni-grafana-border-radius-default', theme.shape.radius.default);
  }, [theme]);

  const sanitizedFilter = useMemo(() => {
    if (isLegacyFilter) {
      return filterXSSLINQExpression(value);
    }

    return value;
  }, [value, isLegacyFilter]);

  const configuredFields: QBField[] = useMemo(() => {
    if (!fields) {
      return [];
    }

    return (fields as QBField[])?.map(field => {

      if (field.lookup) {
        // required for valueFormatFunction to work
        return { ...field, dataType: 'enum' as const };
      }
      return field;
    });
  }, [fields]);

  const sortFieldsByLabel = (fields: QueryBuilderField[]) => {
    return fields.sort((a, b) => {
      return (a.label ?? '').localeCompare(b.label ?? '');
    });
  }

  const sortedFields = useMemo(() => {
    if (!fields) {
      return [];
    }
    const fieldsToSort = isLegacyFilter ? (fields as QueryBuilderField[]) : configuredFields;
    return sortFieldsByLabel([...fieldsToSort]);
  }, [fields, configuredFields, isLegacyFilter]);

  // Prevents navigation triggered by ul>li>a[href="javascript:void(0)"] elements inside the QueryBuilder dropdowns
  const clickHandler = (ev: React.MouseEvent) => {
    if ((ev.target as HTMLElement).closest('a[href^="javascript:"]')) {
      ev.preventDefault();
    }
  };

  useEffect(() => {
    if (isLegacyFilter || isInitializedRef.current) {
      return;
    }

    const queryBuilder = getQueryBuilderInstance()?.nativeElement || getQueryBuilderInstance();
    if (!queryBuilder) {
      return;
    }

    isInitializedRef.current = configuredFields.length > 0;
    if (!isInitializedRef.current) {
      return;
    }

    queryBuilder.valueFormatFunction = (options: any) => {
      if (options.dataType === 'enum' && options.label === options.value) {
        return configuredFields.find(field => field.dataField === options.dataField)?.lookup?.dataSource.find(item => item.value === options.value)?.label ?? options.label;
      }

      return options.label;
    };

    queryBuilder.value = sanitizedFilter;
  }, [sanitizedFilter, isLegacyFilter, getQueryBuilderInstance, configuredFields]);

  return (
    <div ref={wrapperRef} onClick={clickHandler}>
      <QueryBuilder
        customOperations={customOperations}
        fields={sortedFields}
        messages={messages}
        onChange={onChange}
        value={isLegacyFilter ? sanitizedFilter : undefined}
        validateOnInput={validateOnInput}
        showIcons={showIcons}
        disabled={disabled}
        fieldsMode='static'
        theme='ni-grafana'
      />
    </div>
  );
};
