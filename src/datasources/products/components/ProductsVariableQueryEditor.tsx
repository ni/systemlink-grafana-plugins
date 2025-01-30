import { QueryEditorProps } from "@grafana/data";
import { ProductsDataSource } from "../ProductsDataSource";
import { ProductVariableQuery, QBField } from "../types";
import { InlineField } from 'core/components/InlineField';
import { ProductsQueryBuilder } from "./query-builder/ProductsQueryBuilder";
import { Workspace } from "core/types";
import React, { useState, useEffect, useMemo } from "react";
import { ProductsQueryBuilderFields } from "../constants/ProductsQueryBuilder.constants";
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

    const FamilyField = useMemo(() => {
        const familyField = ProductsQueryBuilderFields.FAMILY;
        return {
            ...familyField,
            lookup: {
                ...familyField.lookup,
                dataSource: [
                    ...familyNames.map(family => ({ label: family, value: family }))
                ],
                minLength: 1
            }
        }
    }, [familyNames]);

    const productsVariableQueryStaticFields: QBField[] = [
        FamilyField,
        ProductsQueryBuilderFields.NAME,
        ProductsQueryBuilderFields.PROPERTIES
    ];

    return (
        <>
            <InlineField label="Query By" labelWidth={10}>
                <ProductsQueryBuilder
                    filter={query.queryBy}
                    onChange={(event: any) => onQueryByChange(event.detail.linq)}
                    workspaces={workspaces}
                    partNumbers={partNumbers}
                    globalVariableOptions={datasource.globalVariableOptions()}
                    staticFields={productsVariableQueryStaticFields}
                ></ProductsQueryBuilder>
            </InlineField>
            <FloatingError message={datasource.error} />
        </>
    );
};
