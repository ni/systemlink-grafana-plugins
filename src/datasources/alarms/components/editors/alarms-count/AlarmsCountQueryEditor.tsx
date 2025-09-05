import { AlarmsCountQuery } from "datasources/alarms/types/AlarmsCount.types";
import React, { useEffect } from "react";

type Props = {
  query: AlarmsCountQuery;
  handleQueryChange: (query: AlarmsCountQuery, runQuery?: boolean) => void;
};

export function AlarmsCountQueryEditor({ query, handleQueryChange }: Props) {

  useEffect(() => {
    handleQueryChange(query, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
        <span>Placeholder for Alarms Count Query Editor</span>
    </>
  );
}
