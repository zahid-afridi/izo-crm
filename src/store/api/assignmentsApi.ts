import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  PoolData,
  SiteBoardEntry,
  AssignmentRow,
  DailyProgramState,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  DayOffInput,
  RemoveDayOffInput,
  FinalizeInput,
} from '@/types/assignments';

export const assignmentsApi = createApi({
  reducerPath: 'assignmentsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['Pool', 'Board', 'DailyProgram'],
  endpoints: (builder) => ({
    getPool: builder.query<PoolData, string>({
      query: (date) => `api/assignments/pool?date=${date}`,
      providesTags: ['Pool'],
    }),

    getBoard: builder.query<{ entries: SiteBoardEntry[]; allSites: { id: string; name: string; address: string }[] }, string>({
      query: (date) => date ? `api/assignments/board?date=${date}` : `api/assignments/board`,
      providesTags: ['Board'],
      transformResponse: (response: any) => {
        const items: any[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.assignments)
          ? response.assignments
          : [];

        const allSites: { id: string; name: string; address: string }[] = Array.isArray(response?.allSites)
          ? response.allSites.map((s: any) => ({ id: s.id, name: s.name, address: s.address ?? '' }))
          : [];

        const entries = items.map((group: any): SiteBoardEntry => ({
          site: {
            id: group.id,
            name: group.name,
            address: group.address ?? '',
          },
          assignments: (group.workers ?? []).map((w: any): AssignmentRow => ({
            id: w.id,
            siteId: group.id,
            workerId: w.workerId,
            carId: w.car?.id ?? undefined,
            assignedDate: typeof w.assignedDate === 'string'
              ? w.assignedDate
              : new Date(w.assignedDate).toISOString(),
            workerLocked: w.workerIsLocked ?? false,
            carLocked: false,
            status: w.status ?? 'active',
            notes: w.notes ?? undefined,
            worker: { id: w.workerId, fullName: w.workerName },
            car: w.car
              ? { id: w.car.id, name: w.car.name, number: w.car.number }
              : undefined,
            site: { id: group.id, name: group.name, address: group.address ?? '' },
          })),
        }));

        return { entries, allSites };
      },
    }),

    createAssignment: builder.mutation<{ assignment: AssignmentRow }, CreateAssignmentInput>({
      query: (body) => ({
        url: 'api/assignments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pool', 'Board'],
    }),

    updateAssignment: builder.mutation<{ assignment: AssignmentRow }, UpdateAssignmentInput>({
      query: ({ id, ...body }) => ({
        url: `api/assignments/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Pool', 'Board'],
    }),

    deleteAssignment: builder.mutation<void, string>({
      query: (id) => ({
        url: `api/assignments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Pool', 'Board'],
    }),

    markDayOff: builder.mutation<void, DayOffInput>({
      query: (body) => ({
        url: 'api/assignments/day-off',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pool'],
    }),

    removeDayOff: builder.mutation<void, RemoveDayOffInput>({
      query: (body) => ({
        url: 'api/assignments/day-off',
        method: 'DELETE',
        body,
      }),
      invalidatesTags: ['Pool'],
    }),

    bulkDayOff: builder.mutation<{ count: number }, { date: string }>({
      query: (body) => ({
        url: 'api/assignments/day-off/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pool'],
    }),

    finalize: builder.mutation<{ dailyProgram: DailyProgramState }, FinalizeInput>({
      query: (body) => ({
        url: 'api/assignments/finalize-daily-program',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['DailyProgram', 'Pool', 'Board'],
    }),

    getDailyProgram: builder.query<{ dailyProgram: DailyProgramState }, string>({
      query: (date) => `api/assignments/finalize-daily-program?date=${date}`,
      providesTags: ['DailyProgram'],
    }),
  }),
});

export const {
  useGetPoolQuery,
  useGetBoardQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useDeleteAssignmentMutation,
  useMarkDayOffMutation,
  useRemoveDayOffMutation,
  useBulkDayOffMutation,
  useFinalizeMutation,
  useGetDailyProgramQuery,
} = assignmentsApi;
