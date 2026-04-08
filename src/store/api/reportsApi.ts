import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  SiteReportParams,
  SiteReportResult,
  WorkerReportParams,
  WorkerReportResult,
  PayrollReport,
} from '@/types/assignments';

function buildQueryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, value);
    }
  }
  return search.toString();
}

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  endpoints: (builder) => ({
    getSiteReport: builder.query<SiteReportResult, SiteReportParams>({
      query: ({ siteId, mode, dateFrom, dateTo, month }) =>
        `api/reports/site?${buildQueryString({ siteId, mode, dateFrom, dateTo, month })}`,
    }),

    getWorkerReport: builder.query<WorkerReportResult, WorkerReportParams>({
      query: ({ workerId, mode, date, month }) =>
        `api/reports/worker?${buildQueryString({ workerId, mode, date, month })}`,
    }),

    getPayrollReport: builder.query<PayrollReport, string>({
      query: (month) => `api/reports/payroll?month=${month}`,
    }),
  }),
});

export const {
  useLazyGetSiteReportQuery,
  useLazyGetWorkerReportQuery,
  useLazyGetPayrollReportQuery,
} = reportsApi;
