'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchWorkers,
  createWorker,
  updateWorker,
  updateWorkerField,
  deleteWorker,
  setSearchFilter,
  setStatusFilter,
  setPage,
  clearError,
  type Worker,
} from '@/store/slices/workersSlice';
import {
  selectAllWorkers,
  selectFilteredWorkers,
  selectWorkersIsLoading,
  selectWorkersIsInitialized,
  selectWorkersError,
  selectWorkerStats,
  selectWorkerById,
  selectWorkersFilters,
  selectWorkersPagination,
} from '@/store/selectors/workersSelectors';

export function useWorkers() {
  const dispatch = useAppDispatch();

  const allWorkers = useAppSelector(selectAllWorkers);
  const filteredWorkers = useAppSelector(selectFilteredWorkers);
  const isLoading = useAppSelector(selectWorkersIsLoading);
  const isInitialized = useAppSelector(selectWorkersIsInitialized);
  const error = useAppSelector(selectWorkersError);
  const stats = useAppSelector(selectWorkerStats);
  const filters = useAppSelector(selectWorkersFilters);
  const pagination = useAppSelector(selectWorkersPagination);

  const handleFetchWorkers = async (params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) => {
    return dispatch(fetchWorkers(params));
  };

  const handleCreateWorker = async (
    workerData: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'> & {
      createdByUserId?: string;
    }
  ) => {
    const result = await dispatch(createWorker(workerData));
    if (createWorker.fulfilled.match(result)) {
      return result.payload;
    }
    throw new Error(result.payload as string);
  };

  const handleUpdateWorker = async (
    id: string,
    data: Partial<Worker> & { updatedByUserId?: string }
  ) => {
    const result = await dispatch(updateWorker({ id, data }));
    if (updateWorker.fulfilled.match(result)) {
      return result.payload;
    }
    throw new Error(result.payload as string);
  };

  const handleUpdateWorkerField = async (
    id: string,
    field: string,
    value: any,
    updatedByUserId?: string
  ) => {
    const result = await dispatch(
      updateWorkerField({ id, field, value, updatedByUserId })
    );
    if (updateWorkerField.fulfilled.match(result)) {
      return result.payload;
    }
    throw new Error(result.payload as string);
  };

  const handleDeleteWorker = async (id: string, deletedByUserId?: string) => {
    const result = await dispatch(deleteWorker({ id, deletedByUserId }));
    if (deleteWorker.fulfilled.match(result)) {
      return result.payload;
    }
    throw new Error(result.payload as string);
  };

  const handleSetSearchFilter = (search: string) => {
    dispatch(setSearchFilter(search));
  };

  const handleSetStatusFilter = (status: string) => {
    dispatch(setStatusFilter(status));
  };

  const handleSetPage = (page: number) => {
    dispatch(setPage(page));
  };

  const getWorkerById = (id: string) => {
    return useAppSelector(selectWorkerById(id));
  };

  return {
    // State
    allWorkers,
    filteredWorkers,
    isLoading,
    isInitialized,
    error,
    stats,
    filters,
    pagination,

    // Actions
    fetchWorkers: handleFetchWorkers,
    createWorker: handleCreateWorker,
    updateWorker: handleUpdateWorker,
    updateWorkerField: handleUpdateWorkerField,
    deleteWorker: handleDeleteWorker,
    setSearchFilter: handleSetSearchFilter,
    setStatusFilter: handleSetStatusFilter,
    setPage: handleSetPage,
    getWorkerById,
    clearError: () => dispatch(clearError()),
  };
}

export type { Worker };
