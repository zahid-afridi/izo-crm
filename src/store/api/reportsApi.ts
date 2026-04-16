import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

type SiteReportParams = {
  siteId: string;
  mode: 'dateRange' | 'monthly' | 'total';
  dateFrom?: string;
  dateTo?: string;
  month?: string;
};

type SiteReportResult = {
  site: { id: string; name: string };
  rows: Array<{ date: string; workers: string[]; workerCount: number }>;
  summary: { totalWorkerDays: number };
};

type WorkerReportParams = {
  workerId: string;
  mode: 'daily' | 'monthly';
  date?: string;
  month?: string;
};

type WorkerReportResult = {
  worker: { id: string; fullName: string };
  rows: Array<{ date: string; status: string; siteName?: string }>;
  workDays?: number;
  dayOffDays?: number;
};

type PayrollReport = {
  month: string;
  workers: Array<{
    workerId: string;
    fullName: string;
    workDays: number;
    dailySalary: number | null;
    totalEarnings: number | null;
    paidAmount: number;
    dueAmount: number | null;
    missingSalaryWarning: boolean;
  }>;
};

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
