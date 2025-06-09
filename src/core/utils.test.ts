import { TemplateSrv } from "@grafana/runtime";
import { validateNumericInput, enumToOptions, filterXSSField, filterXSSLINQExpression, replaceVariables, queryInBatches, queryUsingSkip, queryUntilComplete } from "./utils";
import { BatchQueryConfig } from "./types";

test('enumToOptions', () => {
  enum fakeStringEnum {
    Label1 = 'Value1',
    Label2 = 'Value2'
  };

  const result = enumToOptions(fakeStringEnum);

  expect(result).toEqual([
    { label: 'Label1', value: 'Value1' },
    { label: 'Label2', value: 'Value2' }
  ]);
});

describe("filterXSSLINQExpression", () => {
  test('Sanitize simple XSS', () => {
    const result = filterXSSLINQExpression('test<script>alert("XSS")</script>');

    expect(result).toEqual('test');
  });

  test('Sanitize escaped <a> attribute', () => {
    const result = filterXSSLINQExpression('test\\<a onmouseover=\'alert(document.cookie)\'\\>xxs link\\</a\\>');

    expect(result).toEqual('test\\<a>xxs link\\</a>');
  });

  test('Sanitize XSS in LINQ expression', () => {
    const result = filterXSSLINQExpression('ExternalCalibration.NextRecommendedDate < \"2024-10-29T02:53:47.647Z\" && ExternalCalibration.NextRecommendedDate > \"2025-10-29T08:53:47.647Z\" && Location.MinionId = \"e2etest-1730102822793-365e021a-d0c5-496c-87f8-8e4e5fa5090f\" && ExternalCalibration.NextRecommendedDate > \"2024-10-29T08:53:43.995Z\" && ExternalCalibration.NextRecommendedDate < \"\\<a onmouseover=\'alert(document.cookie)\'\\>xxs link\\</a\\>\"');

    expect(result).toEqual('ExternalCalibration.NextRecommendedDate < \"2024-10-29T02:53:47.647Z\" && ExternalCalibration.NextRecommendedDate > \"2025-10-29T08:53:47.647Z\" && Location.MinionId = \"e2etest-1730102822793-365e021a-d0c5-496c-87f8-8e4e5fa5090f\" && ExternalCalibration.NextRecommendedDate > \"2024-10-29T08:53:43.995Z\" && ExternalCalibration.NextRecommendedDate < \"\\<a>xxs link\\\"</a>');
  });

  test('LINQ Sanitization test conditions', () => {
    const result = filterXSSLINQExpression('(Example.Field <> \"EXAMPLE_VALUE_1\") && Example.Field < \"EXAMPLE_VALUE_2\" && Example.Field > \"EXAMPLE_VALUE_3\" && Example.Field <= \"EXAMPLE_VALUE_4\" && Example.Field >= \"EXAMPLE_VALUE_5\" && Example.Field != \"EXAMPLE_VALUE_6\"');

    expect(result).toEqual('(Example.Field <> \"EXAMPLE_VALUE_1\") && Example.Field < \"EXAMPLE_VALUE_2\" && Example.Field > \"EXAMPLE_VALUE_3\" && Example.Field <= \"EXAMPLE_VALUE_4\" && Example.Field >= \"EXAMPLE_VALUE_5\" && Example.Field != \"EXAMPLE_VALUE_6\"');
  });
});

describe("filterXSSField", () => {
  test('simple field sanitization', () => {
    const result = filterXSSField({ value: 'test<script>alert("XSS value")</script>', label: 'test<script>alert("XSS label")</script>' });

    expect(result).toEqual({ value: 'test', label: 'test' });
  });
});

describe('validateNumericInput', () => {
  let mockPreventDefault: jest.Mock;

  beforeEach(() => {
    mockPreventDefault = jest.fn();
  });

  test('allows numeric keys', () => {
    const event = { key: '5', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;

    validateNumericInput(event);

    expect(mockPreventDefault).not.toHaveBeenCalled();
  });

  test('allows navigation keys', () => {
    const event = { key: 'Tab', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;

    validateNumericInput(event);

    expect(mockPreventDefault).not.toHaveBeenCalled();
  });

  test('prevents non-numeric keys', () => {
    const event = { key: 'a', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;

    validateNumericInput(event);

    expect(mockPreventDefault).toHaveBeenCalled();
  });

  test('prevents invalid special characters', () => {
    const event = { key: '@', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;

    validateNumericInput(event);

    expect(mockPreventDefault).toHaveBeenCalled();
  });
});

describe('replaceVariables', () => {
  let mockTemplateSrv: TemplateSrv;

  beforeEach(() => {
    mockTemplateSrv = {
      containsTemplate: jest.fn(),
      replace: jest.fn(),
    } as unknown as TemplateSrv;
  });

  test('should replace variables when multi-value variables are selected', () => {
    mockTemplateSrv.containsTemplate = jest.fn().mockReturnValue(true);
    mockTemplateSrv.replace = jest.fn().mockReturnValue('{value1,value2}');

    const result = replaceVariables(['$var1'], mockTemplateSrv);

    expect(result).toEqual(['value1', 'value2']);
  });

  test('should replace variables when single value variable is selected', () => {
    mockTemplateSrv.containsTemplate = jest.fn().mockReturnValue(true);
    mockTemplateSrv.replace = jest.fn().mockReturnValue('value1');

    const result = replaceVariables(['$var1'], mockTemplateSrv);

    expect(result).toEqual(['value1']);
  });

  test('should replace variables when multiple variables are selected', () => {
    mockTemplateSrv.containsTemplate = jest.fn().mockReturnValue(true);
    mockTemplateSrv.replace = jest.fn((variable: string) => ({
      '$var1': '{value1,value2}',
      '$var2': '{value3,value4}',
      '$var3': 'value5',
    }[variable] || variable));

    const result = replaceVariables(['$var1', '$var2', '$var3'], mockTemplateSrv);

    expect(result).toEqual(['value1', 'value2', 'value3', 'value4', 'value5']);
  })

  test('should return original values when no variables are found', () => {
    mockTemplateSrv.containsTemplate = jest.fn().mockReturnValue(false);

    const result = replaceVariables(['value1', 'value2'], mockTemplateSrv);

    expect(result).toEqual(['value1', 'value2']);
  });

  test('should deduplicate and flatten the replaced values', () => {
    mockTemplateSrv.containsTemplate = jest.fn().mockReturnValue(true);
    mockTemplateSrv.replace = jest.fn((variable: string) => ({
      '$var1': '{value1,value2}',
      '$var2': '{value2,value3}',
      '$var3': 'value3',
    }[variable] || variable));
    const result = replaceVariables(['$var1', '$var2', '$var3'], mockTemplateSrv);

    expect(result).toEqual(['value1', 'value2', 'value3']);
  });
});

describe('queryInBatches', () => {
  const mockQueryRecord = jest.fn();
  const queryConfig: BatchQueryConfig = {
    maxTakePerRequest: 100,
    requestsPerSecond: 2,
  };

  beforeEach(() => {
    mockQueryRecord.mockReset();
  });

  test('should fetch records when take is 0', async () => {
    mockQueryRecord.mockResolvedValue({
      data: [],
      totalCount: 1000,
      continuationToken: null,
    });
    const result = await queryInBatches(mockQueryRecord, queryConfig, 0);
    expect(mockQueryRecord).toHaveBeenCalledTimes(1);
    expect(mockQueryRecord).toHaveBeenCalledWith(0);
    expect(result).toEqual({
      data: [],
      totalCount: 1000,
      continuationToken: null,
    });
  });

  test('should fetch all records in a single request when take is less than maxTakePerRequest', async () => {
    mockQueryRecord.mockResolvedValue({
      data: [{ id: 1 }, { id: 2 }],
      totalCount: 2,
      continuationToken: null,
    });

    const result = await queryInBatches(mockQueryRecord, queryConfig, 2);

    expect(mockQueryRecord).toHaveBeenCalledTimes(1);
    expect(mockQueryRecord).toHaveBeenCalledWith(2);
    expect(result).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      totalCount: 2,
      continuationToken: null,
    });
  });

  test('should fetch records in multiple requests when take is greater than maxTakePerRequest', async () => {
    mockQueryRecord
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 1 }),
        continuationToken: 'token1',
        totalCount: 200,
      })
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 2 }),
        continuationToken: undefined,
        totalCount: 200,
      });

    const result = await queryInBatches(mockQueryRecord, queryConfig, 200);

    expect(mockQueryRecord).toHaveBeenCalledTimes(2);
    expect(mockQueryRecord).toHaveBeenNthCalledWith(1, 100, undefined);
    expect(mockQueryRecord).toHaveBeenNthCalledWith(2, 100, 'token1');
    expect(result.data.length).toBe(200);
  });

  test('should stop fetching when totalCount is reached', async () => {
    mockQueryRecord
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 1 }),
        continuationToken: 'token1',
        totalCount: 150,
      })
      .mockResolvedValueOnce({
        data: Array(50).fill({ id: 2 }),
        continuationToken: undefined,
        totalCount: 150,
      });

    const result = await queryInBatches(mockQueryRecord, queryConfig, 200);

    expect(mockQueryRecord).toHaveBeenCalledTimes(2);
    expect(result.data.length).toBe(150);
  });

  test('should handle no continuationToken and return all data', async () => {
    mockQueryRecord.mockResolvedValue({
      data: Array(50).fill({ id: 1 }),
      continuationToken: undefined,
      totalCount: 50,
    });

    const result = await queryInBatches(mockQueryRecord, queryConfig, 50);

    expect(mockQueryRecord).toHaveBeenCalledTimes(1);
    expect(result.data.length).toBe(50);
  });

  test('should delay between batches if requests exceed requestsPerSecond', async () => {
    jest.useFakeTimers();
    mockQueryRecord
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 1 }),
        continuationToken: 'token1',
        totalCount: 300,
      })
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 2 }),
        continuationToken: 'token2',
        totalCount: 300,
      })
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 3 }),
        continuationToken: undefined,
        totalCount: 300,
      });

    const promise = queryInBatches(mockQueryRecord, queryConfig, 300);
    jest.advanceTimersByTime(1000);
    await promise;

    expect(mockQueryRecord).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });
});

describe('queryUntilComplete', () => {
  const mockQueryRecord = jest.fn();
  const batchQueryConfig = {
    maxTakePerRequest: 100,
    requestsPerSecond: 2,
  };

  beforeEach(() => {
    mockQueryRecord.mockReset();
  });

  test('should fetch all data in a single batch when no continuation token is returned', async () => {
    mockQueryRecord.mockResolvedValue({
      data: Array(50).fill({ id: 1 }),
      continuationToken: undefined,
    });

    const result = await queryUntilComplete(mockQueryRecord, batchQueryConfig);

    expect(mockQueryRecord).toHaveBeenCalledTimes(1);
    expect(mockQueryRecord).toHaveBeenCalledWith(100, undefined);
    expect(result.data.length).toBe(50);
  });

  test('should fetch data across multiple batches when continuation token is returned', async () => {
    mockQueryRecord
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 1 }),
        continuationToken: 'token1',
      })
      .mockResolvedValueOnce({
        data: Array(50).fill({ id: 2 }),
        continuationToken: null,
      });

    const result = await queryUntilComplete(mockQueryRecord, batchQueryConfig);

    expect(mockQueryRecord).toHaveBeenCalledTimes(2);
    expect(mockQueryRecord).toHaveBeenNthCalledWith(1, 100, undefined);
    expect(mockQueryRecord).toHaveBeenNthCalledWith(2, 100, 'token1');
    expect(result.data.length).toBe(150);
  });

  test('should delay between requests if requests exceed requestsPerSecond', async () => {
    jest.useFakeTimers();
    mockQueryRecord
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 1 }),
        continuationToken: 'token1',
      })
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 2 }),
        continuationToken: 'token2',
      })
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 3 }),
        continuationToken: null,
      });

    const promise = queryUntilComplete(mockQueryRecord, batchQueryConfig);
    jest.advanceTimersByTime(1000);
    await promise;

    expect(mockQueryRecord).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  test('should stop fetching when continuation token is null', async () => {
    mockQueryRecord
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 1 }),
        continuationToken: 'token1',
      })
      .mockResolvedValueOnce({
        data: Array(50).fill({ id: 2 }),
        continuationToken: null,
      });

    const result = await queryUntilComplete(mockQueryRecord, batchQueryConfig);

    expect(mockQueryRecord).toHaveBeenCalledTimes(2);
    expect(result.data.length).toBe(150);
  });

  it('should handle errors during query execution', async () => {
    mockQueryRecord.mockRejectedValue(new Error('Query failed'));

    await expect(queryUntilComplete(mockQueryRecord, batchQueryConfig)).rejects.toThrow('Query failed');
    expect(mockQueryRecord).toHaveBeenCalledTimes(1);
  });
});



describe('queryUsingSkip', () => {
  const mockQueryRecord = jest.fn();
  const queryConfig: BatchQueryConfig = {
    maxTakePerRequest: 100,
    requestsPerSecond: 2,
  };

  beforeEach(() => {
    mockQueryRecord.mockReset();
  });

  test('should fetch all records in a single request when total records are less than maxTakePerRequest', async () => {
    mockQueryRecord.mockResolvedValue({
      data: [{ id: 1 }, { id: 2 }],
      totalCount: 2,
    });

    const result = await queryUsingSkip(mockQueryRecord, queryConfig);

    expect(mockQueryRecord).toHaveBeenCalledTimes(1);
    expect(mockQueryRecord).toHaveBeenCalledWith(100, 0);
    expect(result).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      totalCount: 2,
    });
  });

  test('should fetch records in multiple requests when total records exceed maxTakePerRequest', async () => {
    mockQueryRecord
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 1 }),
        totalCount: 100,
      })
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 2 }),
        totalCount: 100,
      })
      .mockResolvedValueOnce({
        data: Array(99).fill({ id: 3 }),
        totalCount: 99,
      });
    jest.clearAllMocks();

    const result = await queryUsingSkip(mockQueryRecord, queryConfig);

    expect(mockQueryRecord).toHaveBeenCalledTimes(3);
    expect(mockQueryRecord).toHaveBeenNthCalledWith(1, 100, 0);
    expect(mockQueryRecord).toHaveBeenNthCalledWith(2, 100, 100);
    expect(mockQueryRecord).toHaveBeenNthCalledWith(3, 100, 200);
    expect(result.data.length).toBe(299);
  });

  test('should stop fetching when fewer records are returned than maxTakePerRequest', async () => {
    mockQueryRecord
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 1 }),
        totalCount: 150,
      })
      .mockResolvedValueOnce({
        data: Array(50).fill({ id: 2 }),
        totalCount: 150,
      });

    const result = await queryUsingSkip(mockQueryRecord, queryConfig);

    expect(mockQueryRecord).toHaveBeenCalledTimes(2);
    expect(result.data.length).toBe(150);
  });

  test('should handle errors during batch fetch and stop further requests', async () => {
    mockQueryRecord
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 1 }),
        totalCount: 300,
      })
      .mockRejectedValueOnce(new Error('Test error'));

    const result = await queryUsingSkip(mockQueryRecord, queryConfig);

    expect(mockQueryRecord).toHaveBeenCalledTimes(2);
    expect(result.data.length).toBe(100);
  });

  test('should delay between requests if requests exceed requestsPerSecond', async () => {
    jest.useFakeTimers();
    mockQueryRecord
      .mockResolvedValueOnce({
        data: Array(100).fill({ id: 1 }),
        totalCount: 100,
      })
      .mockResolvedValueOnce({
        data: Array(99).fill({ id: 2 }),
        totalCount: 99,
      });

    const promise = queryUsingSkip(mockQueryRecord, queryConfig);
    jest.advanceTimersByTime(1000);
    await promise;

    expect(mockQueryRecord).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
