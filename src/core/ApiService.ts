import { BackendSrv, BackendSrvRequest } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';

export class ApiService {
  constructor(private backendSrv: BackendSrv, private baseUrl: string) {}

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    return this.backendSrv.get<T>(`${this.baseUrl}${path}`, params);
  }

  async post<T>(path: string, body: Record<string, any>, options: Partial<BackendSrvRequest> = {}): Promise<T> {
    return this.backendSrv.post<T>(`${this.baseUrl}${path}`, body, options);
  }

  async fetch<T>(options: BackendSrvRequest): Promise<T> {
  return (await lastValueFrom(this.backendSrv.fetch<T>(options))).data;
}
}
