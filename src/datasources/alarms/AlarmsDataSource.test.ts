import { AlarmsDataSource } from './AlarmsDataSource';
import { DataSourceInstanceSettings } from '@grafana/data';

describe('AlarmsDataSource', () => {
  const instanceSettings = { url: 'http://localhost' } as DataSourceInstanceSettings;
  const ds = new AlarmsDataSource(instanceSettings);

  it('should instantiate', () => {
    expect(ds).toBeInstanceOf(AlarmsDataSource);
  });

  it('should have defaultQuery', () => {
    expect(ds.defaultQuery).toBeDefined();
  });

  it('should run testDatasource', async () => {
    ds.post = jest.fn().mockResolvedValue({});
    const result = await ds.testDatasource();
    expect(result.status).toBe('success');
  });
});
