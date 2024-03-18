import React, { FormEvent } from 'react';
import { InlineField } from "../../../core/components/InlineField";
import { AutoSizeInput } from "@grafana/ui";
import { AssetVariableQuery } from "../types";

interface Props {
  query: AssetVariableQuery;
  onChange: (query: AssetVariableQuery) => void;
}

export function AssetVariableQueryEditor({ onChange, query }: Props) {

  return (
    <InlineField label="System">
      <AutoSizeInput
        onCommitChange={(event: FormEvent<HTMLInputElement>) => onChange({ minionId: event.currentTarget.value ?? '' })}
        placeholder="Any system"
        defaultValue={query.minionId}
      />
    </InlineField>
  );
}
