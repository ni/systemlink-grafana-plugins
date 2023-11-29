import React, {useState} from 'react';
import {QueryEditorProps, SelectableValue, toOption} from '@grafana/data';
import {InlineField} from 'core/components/InlineField';
import {AssetUtilizationDataSource} from '../AssetUtilizationDataSource';
import {
    AssetFilterProperties,
    AssetUtilizationQuery, IsNIAsset, IsPeak,
    UtilizationCategory,
    UtilizationTimeFrequency,
    Weekday
} from '../types';
import {FloatingError, parseErrorMessage} from "../errors";
import {useAsync} from "react-use";
import {getTemplateSrv} from "@grafana/runtime";
import {arraysEqual} from "../helper";
import {MultiSelect, RadioButtonGroup, Select} from "@grafana/ui";
import {isValidId} from "../../data-frame/utils";
import {
    isNIAssetOptions, isPeakOptions,
    peakDayOptions,
    utilizationCategoryOptions,
    utilizationTimeFrequencyOptions
} from "../constants";

type Props = QueryEditorProps<AssetUtilizationDataSource, AssetUtilizationQuery>;

export function AssetUtilizationQueryEditor({query, onChange, onRunQuery, datasource, ...props}: Props) {
    query = datasource.prepareQuery(query);
    console.log('AssetUtilizationQueryEditor - query', query)
    const [errorMsg, setErrorMsg] = useState<string>('');

    const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));

    const minionIds = useAsync(
        () => {
            console.log('run minionID')
            return datasource.queryAssets("IsSystemController = true").catch(handleError)
        }, []
    );
    const assetIds = useAsync(() => {
        let filterArray = []


        let isNIAsset = query.isNIAsset === IsNIAsset.NIASSET
            ? true
            : query.isNIAsset === IsNIAsset.NOTNIASSET
                ? false
                : null;
        filterArray.push(typeof isNIAsset === 'boolean' ? `${AssetFilterProperties.IsNIAsset} = "${isNIAsset}"` : ``)


        if (query.minionId) {
            const resolvedId = getTemplateSrv().replace(query.minionId);
            filterArray.push(`${AssetFilterProperties.LocationMinionId} = "${resolvedId}"`)
        }

        let filter = filterArray.filter(Boolean).join(' and ');
        return datasource.queryAssets(filter).catch(handleError)
    }, [query.minionId, query.isNIAsset]);

    const handleQueryChange = (value: AssetUtilizationQuery, runQuery: boolean) => {
        onChange(value);
        if (runQuery) {
            onRunQuery();
        }
    };

    const handleAssetIdentifierChange = (item: SelectableValue<string>) => {

        if (query.assetIdentifier !== item.value) {
            handleQueryChange({...query, assetIdentifier: item.value}, true);
        }
    };

    const handleMinionIdChange = (item: SelectableValue<string>) => {
        if (query.minionId !== item.value) {
            const {assetIdentifier, ...changedQuery} = query
            handleQueryChange({...changedQuery, minionId: item.value!}, false);
        }
    };

    const handleIsNIAssetChange = (value: IsNIAsset) => {
        if (query.isNIAsset !== value) {
            handleQueryChange({...query, isNIAsset: value}, false);
        }
    };

    const handleUtilizationTimeFrequencyChange = (item: UtilizationTimeFrequency) => {
        if (query.timeFrequency !== item) {
            handleQueryChange({...query, timeFrequency: item}, true);
        }
    };

    const handleUtilizationCategoryChange = (value: UtilizationCategory) => {
        if (query.utilizationCategory !== value) {
            handleQueryChange({...query, utilizationCategory: value}, true);
        }
    };

    const handlePeakDaysChange = (items: Array<SelectableValue<Weekday>>) => {
        if (!arraysEqual(items, query.peakDays)) {
            handleQueryChange({...query, peakDays: items.map(item => item.value!)}, true);
        }
    };

    const handleIsPeakChange = (item: IsPeak) => {
        if (query.isPeak !== item) {
            handleQueryChange({...query, isPeak: item}, true);
        }
    };

    const loadMinionIdOptions = () => {
        let options: SelectableValue[] = (minionIds.value ?? []).map(c => ({
                'label': c.location.systemName,
                'value': c.location.minionId,
                'description': c.location.state.systemConnection,
            })
        )

        options.unshift(...getVariableOptions())

        return options
    }

    const loadAssetIdOptions = () => {
        let options: SelectableValue[] = (assetIds.value ?? []).map(c => ({
                'label': c.name,
                'value': c.id,
                description: c.id
            })
        )

        options.unshift(...getVariableOptions())

        return options
    }
    return (
        <div style={{position: 'relative'}}>
            <InlineField label="System Controller"
                         tooltip="Filter assets based on their connection to a specific system controller"
                         labelWidth={20}>
                <Select
                    allowCreateWhileLoading
                    allowCustomValue
                    options={loadMinionIdOptions()}
                    isValidNewOption={isValidId}
                    onChange={handleMinionIdChange}
                    placeholder="Select System Controller"
                    width={85}
                    value={query.minionId ? toOption(query.minionId) : null}
                />
            </InlineField>
            <InlineField label={"Vendor"} tooltip="Filter assets by vendor" labelWidth={20}>
                <RadioButtonGroup
                    options={isNIAssetOptions}
                    value={query.isNIAsset}
                    onChange={(item: any) => handleIsNIAssetChange(item)}
                />
            </InlineField>
            <InlineField label="Asset Identifier"
                         tooltip="Select an asset from the list, search by name or enter the asset ID to visualize the utilization"
                         labelWidth={20}>
                <Select
                    width={85}
                    allowCreateWhileLoading
                    allowCustomValue
                    isValidNewOption={isValidId}
                    options={loadAssetIdOptions()}
                    onChange={handleAssetIdentifierChange}
                    placeholder="Search by name or enter id"
                    value={query.assetIdentifier ? toOption(query.assetIdentifier) : null}
                />
            </InlineField>
            <InlineField label={"Daily or Hourly"}
                         tooltip={"You want daily or hourly utilization?"}
                         labelWidth={20}>
                <RadioButtonGroup
                    fullWidth={true}
                    options={utilizationTimeFrequencyOptions}
                    value={query.timeFrequency}
                    onChange={handleUtilizationTimeFrequencyChange}
                />
            </InlineField>

            <InlineField label={"Utilization Category"}
                         tooltip="Analyze asset utilization based on the purpose of asset usage?" labelWidth={20}>
                <RadioButtonGroup
                    options={utilizationCategoryOptions}
                    value={query.utilizationCategory}
                    onChange={handleUtilizationCategoryChange}
                />
            </InlineField>
            <InlineField label={"Peak days"}
                         tooltip="Analyze asset utilization based on peak or non-peak days specified in SystemLink"
                         labelWidth={20}>
                <MultiSelect
                    width={85}
                    options={peakDayOptions}
                    value={query.peakDays.map(day => {
                        console.log('peakDayOptions', peakDayOptions)
                        console.log('day', day)
                        return peakDayOptions[day]
                    })}
                    onChange={(item: any) => handlePeakDaysChange(item)}
                />
            </InlineField>
            <InlineField label={"Peak / Non-peak"}
                         tooltip="Analyze data based on peak or non-peak hours specified in SystemLink" labelWidth={20}>
                <RadioButtonGroup
                    options={isPeakOptions}
                    value={query.isPeak}
                    onChange={handleIsPeakChange}
                />
            </InlineField>
            <FloatingError message={errorMsg}/>

        </div>
    );
}

const getVariableOptions = () => {
    return getTemplateSrv()
        .getVariables()
        .map((v) => toOption('$' + v.name));
};
