import { MockProxy, mock } from "jest-mock-extended"
import { AssetUtilizationDataSource } from "../AssetUtilizationDataSource"
import { act } from "react-dom/test-utils"
import { assetModelMock, createFetchResponse, requestMatching, setupDataSource, setupRenderer } from "test/fixtures"
import { AssetUtilizationQuery, IsNIAsset, IsPeak, UtilizationCategory, UtilizationTimeFrequency, Weekday } from "../types"
import { render, screen, } from "@testing-library/react"
import { AssetUtilizationQueryEditor } from "./AssetUtilizationQueryEditor"
import { BackendSrv, TemplateSrv } from "@grafana/runtime"
import { select } from "react-select-event"
import React from "react"
import userEvent from "@testing-library/user-event"

const onRunQuery = jest.fn()
const onChange = jest.fn()

let ds: AssetUtilizationDataSource, backendSrv: MockProxy<BackendSrv>, templateSrv: MockProxy<TemplateSrv>;

beforeEach(() => {
  [ds, backendSrv, templateSrv] = setupDataSource(AssetUtilizationDataSource);
});

afterEach(() => { jest.clearAllMocks() })

// const renderer = setupRenderer(AssetUtilizationQueryEditor, AssetUtilizationDataSource);
// const [onChange, onRunQuery] = renderer({...notebookQueryMock, peakDays: [Weekday.Monday, Weekday.Tuesday]})

const notebookQueryMock = mock<AssetUtilizationQuery>()

test('renders succefully with NI asset', async () => {
  render(<AssetUtilizationQueryEditor
    onChange={onChange}
    datasource={ds}
    onRunQuery={onRunQuery}
    query={{ ...notebookQueryMock, isNIAsset: IsNIAsset.NIASSET, minionId: 'minion1' }}
  />)

  expect(ds.backendSrv.fetch).toHaveBeenCalledWith(expect.objectContaining({
    data: {
      filter: 'IsNIAsset = "true" and Location.MinionId = "minion1"',
      take: -1
    },
    method: 'POST',
    url: '/niapm/v1/query-assets'
  }))
  expect(screen.getByText('System Controller')).toBeInTheDocument()
})

test('renders succefully with non-NI asset', async () => {
  await act(async () => {
    render(<AssetUtilizationQueryEditor
      onChange={onChange}
      datasource={ds}
      onRunQuery={onRunQuery}
      query={{ ...notebookQueryMock, isNIAsset: IsNIAsset.NOTNIASSET, minionId: 'minion1' }}
    />)
  })

  expect(ds.backendSrv.fetch).toHaveBeenCalledWith(expect.objectContaining({
    data: {
      filter: 'IsNIAsset = "false" and Location.MinionId = "minion1"',
      take: -1
    },
    method: 'POST',
    url: '/niapm/v1/query-assets'
  }))
  expect(screen.getByText('System Controller')).toBeInTheDocument()
})

test('builds asset identifier option', async ()  => {
  const assetIdentifierMock = 'asset1' 
  await act(async () => {
    render(<AssetUtilizationQueryEditor 
      onChange={onChange}
      datasource={ds}
      onRunQuery={onRunQuery}
      query={{ ...notebookQueryMock, assetIdentifier: assetIdentifierMock}}
    />)

    expect(screen.getByText(assetIdentifierMock)).toBeInTheDocument()
  })

})

// test('handles error', async () => {
//   const datasourceMock = mock<AssetUtilizationDataSource>(
//     { backendSrv, templateSrv }
//   )
//   datasourceMock.prepareQuery.mockReturnValue(notebookQueryMock)
//   datasourceMock.queryAssets.mockRejectedValue('deu ruim')

//   await act(async () => {
//     const {container} = render(<AssetUtilizationQueryEditor
//       onChange={onChange}
//       datasource={ds}
//       onRunQuery={onRunQuery}
//       query={{...notebookQueryMock}}
//     />)
//     console.log(container.outerHTML)

//   })

//   expect(screen.getByText('deu ruim')).toBeInTheDocument()
// })

test('handles minionId change', async () => {
  backendSrv.fetch
    .calledWith(requestMatching({ url: '/niapm/v1/query-assets' }))
    .mockReturnValue(createFetchResponse({ assets: assetModelMock }))

  render(<AssetUtilizationQueryEditor
    onChange={onChange}
    datasource={ds}
    onRunQuery={onRunQuery}
    query={{ ...notebookQueryMock, minionId: '' }}
  />)
  await act(async () => {
    const input = screen.getAllByRole('combobox')[0]
    await select(input, 'system1', { container: document.body });
  })

  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minionId: 'minion1' }))
})

test('handles asset identifier change', async () => {
  backendSrv.fetch
    .calledWith(requestMatching({ url: '/niapm/v1/query-assets' }))
    .mockReturnValue(createFetchResponse({ assets: assetModelMock }))

  render(<AssetUtilizationQueryEditor
    onChange={onChange}
    datasource={ds}
    onRunQuery={onRunQuery}
    query={{ ...notebookQueryMock, assetIdentifier: '' }}
  />)
  await act(async () => {
    const input = screen.getAllByRole('combobox')[1]
    await select(input, 'asset1', { container: document.body });
  })

  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ assetIdentifier: '123' }))
  expect(onRunQuery).toHaveBeenCalledTimes(1)
})

test('handles utilization frequency change', async () => {
  render(<AssetUtilizationQueryEditor
    onChange={onChange}
    datasource={ds}
    onRunQuery={onRunQuery}
    query={{ ...notebookQueryMock, timeFrequency: UtilizationTimeFrequency.HOURLY }}
  />)

  await act(async () => {
    const input = screen.getByLabelText('Daily')
    await userEvent.click(input)
  })

  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ timeFrequency: UtilizationTimeFrequency.DAILY }))
  expect(onRunQuery).toHaveBeenCalledTimes(1)
})


test('handles utilization category change', async () => {
  render(<AssetUtilizationQueryEditor
    onChange={onChange}
    datasource={ds}
    onRunQuery={onRunQuery}
    query={{ ...notebookQueryMock, utilizationCategory: UtilizationCategory.ALL }}
  />)

  await act(async () => {
    const input = screen.getByLabelText('Test')
    await userEvent.click(input)
  })

  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ utilizationCategory: UtilizationCategory.TEST }))
  expect(onRunQuery).toHaveBeenCalledTimes(1)
})


test('handles peak days change', async () => {
  render(<AssetUtilizationQueryEditor
    onChange={onChange}
    datasource={ds}
    onRunQuery={onRunQuery}
    query={{ ...notebookQueryMock, peakDays: [Weekday.Monday, Weekday.Tuesday] }}
  />)

  await act(async () => {
    const button = screen.getAllByRole('button')[0]
    await userEvent.click(button)
  })

  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ peakDays: [Weekday.Tuesday] }))
  expect(onRunQuery).toHaveBeenCalledTimes(1)
})


test('handles is NI Asset change', async () => {
  render(<AssetUtilizationQueryEditor
    onChange={onChange}
    datasource={ds}
    onRunQuery={onRunQuery}
    query={notebookQueryMock}
  />)

  await act(async () => {
    const input = screen.getByLabelText('NI')
    await userEvent.click(input)
  })

  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ isNIAsset: IsNIAsset.NIASSET }))
})

test('handles is peak change', async () => {
  render(<AssetUtilizationQueryEditor
    onChange={onChange}
    datasource={ds}
    onRunQuery={onRunQuery}
    query={{ ...notebookQueryMock, isPeak: IsPeak.NONPEAK }}
  />)

  await act(async () => {
    const input = screen.getByLabelText('Peak')
    await userEvent.click(input)
  })

  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ isPeak: IsPeak.PEAK }))
  expect(onRunQuery).toHaveBeenCalledTimes(1)
})

