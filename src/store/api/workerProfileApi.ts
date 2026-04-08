import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  WorkerAssignmentsData,
  WorkSummaryData,
  WorkSummaryParams,
} from '@/types/assignments';

export const workerProfileApi = createApi({
  reducerPath: 'workerProfileApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['WorkerAssignments', 'WorkSummary'],
  endpoints: (builder) => ({
    getMyAssignments: builder.query<WorkerAssignmentsData, string>({
      query: (workerId) => `api/worker-profile/assignments?workerId=${workerId}`,
      providesTags: ['WorkerAssignments'],
    }),

    getWorkSummary: builder.query<WorkSummaryData, WorkSummaryParams>({
      query: ({ workerId, month }) => {
        const params = new URLSearchParams({ workerId });
        if (month) params.set('month', month);
        return `api/worker-profile/summary?${params.toString()}`;
      },
      providesTags: ['WorkSummary'],
    }),
  }),
});

export const {
  useGetMyAssignmentsQuery,
  useGetWorkSummaryQuery,
} = workerProfileApi;
