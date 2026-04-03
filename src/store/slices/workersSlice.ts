import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Worker {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  idNumber?: string;
  address?: string;
  role: string;
  status?: string;
  worker?: {
    id: string;
    employeeType: string;
    hourlyRate?: number;
    monthlyRate?: number;
    removeStatus: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkersState {
  byId: Record<string, Worker>;
  allIds: string[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  filters: {
    search: string;
    status: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

const initialState: WorkersState = {
  byId: {},
  allIds: [],
  isLoading: false,
  isInitialized: false,
  error: null,
  filters: {
    search: '',
    status: 'all',
  },
  pagination: {
    page: 1,
    pageSize: 50,
    total: 0,
  },
};

let pendingFetchRequest: Promise<any> | null = null;

/**
 * Fetch all workers with deduplication
 */
export const fetchWorkers = createAsyncThunk(
  'workers/fetchWorkers',
  async (
    params: { search?: string; status?: string; page?: number; pageSize?: number } | undefined,
    { rejectWithValue }
  ) => {
    if (pendingFetchRequest) {
      return pendingFetchRequest;
    }

    try {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.status && params.status !== 'all') query.append('status', params.status);
      if (params?.page) query.append('page', params.page.toString());
      if (params?.pageSize) query.append('pageSize', params.pageSize.toString());

      const request = fetch(`/api/workers?${query.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      pendingFetchRequest = request;
      const response = await request;

      if (!response.ok) {
        pendingFetchRequest = null;
        return rejectWithValue('Failed to fetch workers');
      }

      const data = await response.json();
      pendingFetchRequest = null;
      // Ensure the returned data is serializable
      return JSON.parse(JSON.stringify(data));
    } catch (error) {
      pendingFetchRequest = null;
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch workers'
      );
    }
  }
);

/**
 * Create new worker
 */
export const createWorker = createAsyncThunk(
  'workers/createWorker',
  async (
    workerData: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'> & { createdByUserId?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(workerData),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to create worker');
      }

      const data = await response.json();
      // The API returns { user, worker }, we need to merge them into a single worker object
      const apiData = data.data;
      const worker = apiData?.user ? JSON.parse(JSON.stringify({
        ...apiData.user,
        worker: apiData.worker,
      })) : null;
      return worker;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to create worker'
      );
    }
  }
);

/**
 * Update worker
 */
export const updateWorker = createAsyncThunk(
  'workers/updateWorker',
  async (
    {
      id,
      data,
    }: {
      id: string;
      data: Partial<Worker> & { updatedByUserId?: string };
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`/api/workers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || 'Failed to update worker');
      }

      const result = await response.json();
      // The API returns { user, worker }, we need to merge them into a single worker object
      const apiData = result.data;
      const worker = apiData?.user ? JSON.parse(JSON.stringify({
        ...apiData.user,
        worker: apiData.worker,
      })) : null;
      return worker;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to update worker'
      );
    }
  }
);

/**
 * Update worker field (PATCH)
 */
export const updateWorkerField = createAsyncThunk(
  'workers/updateWorkerField',
  async (
    {
      id,
      field,
      value,
      updatedByUserId,
    }: {
      id: string;
      field: string;
      value: any;
      updatedByUserId?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`/api/workers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          [field]: value,
          updatedByUserId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error || `Failed to update ${field}`);
      }

      const result = await response.json();
      // The API returns { user, worker }, we need to merge them into a single worker object
      const apiData = result.data;
      const worker = apiData?.user ? JSON.parse(JSON.stringify({
        ...apiData.user,
        worker: apiData.worker,
      })) : null;
      return { id, field, value, worker };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : `Failed to update ${field}`
      );
    }
  }
);

/**
 * Delete worker
 */
export const deleteWorker = createAsyncThunk(
  'workers/deleteWorker',
  async (
    { id, deletedByUserId }: { id: string; deletedByUserId?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`/api/workers/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deletedByUserId }),
      });

      if (!response.ok) {
        return rejectWithValue('Failed to delete worker');
      }

      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to delete worker'
      );
    }
  }
);

const workersSlice = createSlice({
  name: 'workers',
  initialState,
  reducers: {
    setSearchFilter: (state, action: PayloadAction<string>) => {
      state.filters.search = action.payload;
      state.pagination.page = 1;
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.filters.status = action.payload;
      state.pagination.page = 1;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Workers
    builder
      .addCase(fetchWorkers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        // Don't clear data here - keep showing old data while loading new data
      })
      .addCase(fetchWorkers.fulfilled, (state, action) => {
        const workers = action.payload.workers || [];
        
        // Normalize workers - build new state first, then assign atomically
        const newById: Record<string, Worker> = {};
        const newAllIds: string[] = [];
        
        workers.forEach((worker: Worker) => {
          newById[worker.id] = worker;
          newAllIds.push(worker.id);
        });

        // Assign atomically to prevent selector from seeing partial state
        state.byId = newById;
        state.allIds = newAllIds;
        state.pagination.total = action.payload.total || workers.length;
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(fetchWorkers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Worker
    builder
      .addCase(createWorker.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createWorker.fulfilled, (state, action) => {
        state.isLoading = false;
        const worker = action.payload;
        if (worker && worker.id) {
          state.byId[worker.id] = worker;
          if (!state.allIds.includes(worker.id)) {
            state.allIds.unshift(worker.id);
          }
        }
      })
      .addCase(createWorker.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Worker
    builder
      .addCase(updateWorker.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateWorker.fulfilled, (state, action) => {
        state.isLoading = false;
        const worker = action.payload;
        if (worker && worker.id) {
          state.byId[worker.id] = worker;
        }
      })
      .addCase(updateWorker.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Worker Field
    builder
      .addCase(updateWorkerField.pending, (state) => {
        state.error = null;
      })
      .addCase(updateWorkerField.fulfilled, (state, action) => {
        const { id, field, value, worker } = action.payload;
        if (worker) {
          // If we have the full worker object from the API, use it
          state.byId[id] = worker;
        } else if (state.byId[id]) {
          // Otherwise, update just the field
          const currentWorker = state.byId[id];
          
          // Handle nested fields like worker.removeStatus
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            if (parent === 'worker' && currentWorker.worker) {
              currentWorker.worker = {
                ...currentWorker.worker,
                [child]: value,
              };
            }
          } else {
            // Handle top-level fields
            state.byId[id] = {
              ...currentWorker,
              [field]: value,
            };
          }
        }
      })
      .addCase(updateWorkerField.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    //// Delete Worker 
    builder
      .addCase(deleteWorker.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteWorker.fulfilled, (state, action) => {
        state.isLoading = false;
        const workerId = action.payload;
        delete state.byId[workerId];
        state.allIds = state.allIds.filter(id => id !== workerId);
      })
      .addCase(deleteWorker.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSearchFilter, setStatusFilter, setPage, clearError } = workersSlice.actions;
export default workersSlice.reducer;
