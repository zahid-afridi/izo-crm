import { RootState } from '../store';

// Basic selectors
export const selectWorkersById = (state: RootState) => state.workers.byId;

export const selectWorkersAllIds = (state: RootState) => state.workers.allIds;

export const selectWorkersIsLoading = (state: RootState) => state.workers.isLoading;

export const selectWorkersIsInitialized = (state: RootState) => state.workers.isInitialized;

export const selectWorkersError = (state: RootState) => state.workers.error;

export const selectWorkersFilters = (state: RootState) => state.workers.filters;

export const selectWorkersPagination = (state: RootState) => state.workers.pagination;

// Derived selectors
export const selectAllWorkers = (state: RootState) =>
  state.workers.allIds.map(id => state.workers.byId[id]);

export const selectWorkerById = (id: string) => (state: RootState) =>
  state.workers.byId[id];

export const selectWorkersByStatus = (status: string) => (state: RootState) => {
  if (status === 'all') {
    return state.workers.allIds.map(id => state.workers.byId[id]);
  }
  return state.workers.allIds
    .map(id => state.workers.byId[id])
    .filter(worker => worker.worker?.removeStatus === status);
};

export const selectFilteredWorkers = (state: RootState) => {
  const { search, status } = state.workers.filters;
  
  return state.workers.allIds
    .map(id => state.workers.byId[id])
    .filter(worker => {
      const matchesSearch =
        worker.fullName.toLowerCase().includes(search.toLowerCase()) ||
        worker.email.toLowerCase().includes(search.toLowerCase()) ||
        (worker.phone?.includes(search) || false);

      const matchesStatus = status === 'all' || worker.worker?.removeStatus === status;

      return matchesSearch && matchesStatus;
    });
};

export const selectWorkerStats = (state: RootState) => {
  const workers = state.workers.allIds.map(id => state.workers.byId[id]);
  
  return {
    total: workers.length,
    active: workers.filter(w => w.worker?.removeStatus === 'active').length,
    onLeave: workers.filter(w => w.worker?.removeStatus === 'on_leave').length,
    disabled: workers.filter(w => w.worker?.removeStatus === 'disabled').length,
  };
};

export const selectWorkerCount = (state: RootState) => state.workers.allIds.length;
