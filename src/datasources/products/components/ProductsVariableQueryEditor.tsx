import { QueryEditorProps } from "@grafana/data";
import { ProductsDataSource } from "../ProductsDataSource";
import { ProductVariableQuery } from "../types";
import { InlineField } from 'core/components/InlineField';
import { ProductsQueryBuilder } from "./query-builder/ProductsQueryBuilder";
import { Workspace } from "core/types";
import React, { useState, useEffect } from "react";
import { FloatingError } from "core/errors";

type Props = QueryEditorProps<ProductsDataSource, ProductVariableQuery>;

export function ProductsVariableQueryEditor({ query, onChange, datasource }: Props) {

    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [partNumbers, setPartNumbers] = useState<string[]>([]);
    const [familyNames, setFamilyNames] = useState<string[]>([]);

    useEffect(() => {
        const loadWorkspaces = async () => {
            await datasource.areWorkspacesLoaded$;
            setWorkspaces(Array.from(datasource.workspacesCache.values()));
        };
        const loadPartNumbers = async () => {
            await datasource.arePartNumberLoaded$;
            setPartNumbers(Array.from(datasource.partNumbersCache.values()));
        };
        const loadFamilyNames = async () => {
            await datasource.getFamilyNames();
            setFamilyNames(Array.from(datasource.familyNamesCache.values()));
        };

        loadWorkspaces();
        loadPartNumbers();
        loadFamilyNames();
    }, [datasource]);

    const onQueryByChange = (value: string) => {
        onChange({ ...query, queryBy: value });
    };

    return (
        <>
            <InlineField label="Query By" labelWidth={12} tooltip={"Specifies the query to filter products."}>
                <ProductsQueryBuilder
                    filter={query.queryBy}
                    onChange={(event: any) => onQueryByChange(event.detail.linq)}
                    workspaces={workspaces}
                    partNumbers={partNumbers}
                    familyNames={familyNames}
                    globalVariableOptions={datasource.globalVariableOptions()}
                ></ProductsQueryBuilder>
            </InlineField>
            <FloatingError message={datasource.error} />
        </>
    );
};
