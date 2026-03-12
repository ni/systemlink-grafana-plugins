import React, { useMemo } from 'react';
import { MenuGroup, MenuItem, MenuItemsGroup } from '@grafana/ui';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import _ from 'lodash';

export const notEmpty = <TValue,>(value: TValue | null | undefined): value is TValue => {
  return value !== null && value !== undefined;
};

export const getFieldsByName = (frames: DataFrame[], name: string) =>
  frames.map((frame) => _.find(frame.fields, ['name', name])).filter(notEmpty);

export const renderMenuItems = (items: MenuItemsGroup[]) => {
  return items.map((group, index) => (
    <MenuGroup key={`${group.label}${index}`} label={group.label}>
      {group.items.map((item) => (
        <MenuItem key={item.label} {...item} />
      ))}
    </MenuGroup>
  ));
};

// Create Plot component with minimized bundle instead of default
// https://github.com/plotly/react-plotly.js/#customizing-the-plotlyjs-bundle
export const Plot = createPlotlyComponent(Plotly);

export const useTraceColors = (theme: GrafanaTheme2) => {
  return useMemo(() => theme.visualization.palette.map(theme.visualization.getColorByName), [theme]);
};
