import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface AssignmentWorker {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  isLocked: boolean;
}

export interface AssignmentCar {
  id: string;
  name: string;
  number: string;
  color: string;
  model: string;
  status: string;
  isLocked: boolean;
}

export interface AssignmentSite {
  id: string;
  name: string;
  address: string;
  city?: string;
  status: string;
  isCompleted?: boolean;
}

export interface Assignment {
  id: string;
  siteId: string;
  workerId: string;
  carId?: string;
  assignedDate: string;
  status: string;
  notes?: string;
  showAssignmentHistory?: boolean;
  createdAt: string;
  site: AssignmentSite;
  worker: AssignmentWorker;
  car?: AssignmentCar;
}

export interface AssignmentsState {
  assignments: Assignment[];
  allWorkers: AssignmentWorker[];
  availableWorkers: AssignmentWorker[];
  allCars: AssignmentCar[];
  allSites: AssignmentSite[];
  allTeams: any[];
  workersOnDayOff: string[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: AssignmentsState = {
  assignments: [],
  allWorkers: [],
  availableWorkers: [],
  allCars: [],
  allSites: [],
  allTeams: [],
  workersOnDayOff: [],
  isLoading: false,
  isInitialized: false,
  error: null,
};

/** Fetch all board data in a single request */
export const fetchAssignmentsData = createAsyncThunk(
  'assignments/fetchAll',
  async (selectedDate: string | undefined, { rejectWithValue }) => {
    try {
      const url = selectedDate
        ? `/api/assignments/board?date=${selectedDate}`
        : '/api/assignments/board';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed to fetch board data');
      const data = await res.json();

      // Flatten grouped-by-site assignments into a flat array
      const flatAssignments: Assignment[] = [];
      (data.assignments || []).forEach((siteData: any) => {
        siteData.workers.forEach((w: any) => {
          flatAssignments.push({
            id: w.id,
            siteId: siteData.id,
            workerId: w.workerId,
            carId: w.car?.id ?? undefined,
            assignedDate: w.assignedDate,
            status: w.status,
            notes: w.notes,
            showAssignmentHistory: w.showAssignmentHistory ?? false,
            createdAt: w.createdAt,
            site: {
              id: siteData.id,
              name: siteData.name,
              address: siteData.address,
              city: siteData.city,
              status: siteData.siteStatus || 'active',
              isCompleted: siteData.isCompleted || false,
            },
            worker: {
              id: w.workerId,
              fullName: w.workerName,
              email: w.workerEmail,
              phone: w.workerPhone,
              role: w.workerRole,
              isLocked: w.workerIsLocked,
            },
            car: w.car ?? undefined,
          });
        });
      });

      return {
        assignments: flatAssignments,
        allWorkers: data.allWorkers || [],
        availableWorkers: data.availableWorkers || [],
        allCars: data.allCars || [],
        allSites: data.allSites || [],
        allTeams: data.allTeams || [],
        workersOnDayOff: data.workersOnDayOff || [],
      };
    } catch (e) {
      return rejectWithValue('Failed to fetch board data');
    }
  }
);

/** Fetch daily program for a specific date (used when dialog date changes) */
export const fetchDailyProgramThunk = createAsyncThunk(
  'assignments/fetchDailyProgram',
  async (date: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/daily-program?date=${date}`, { credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed to fetch daily program');
      const data = await res.json();
      return (data.workersOnDayOff ?? []) as string[];
    } catch {
      return rejectWithValue('Failed to fetch daily program');
    }
  }
);

/** Lock or unlock workers or cars via the unified lock endpoint */
export const lockEntities = createAsyncThunk(
  'assignments/lock',
  async (
    payload: { type: 'worker' | 'car'; ids: string[]; isLocked: boolean },
    { rejectWithValue }
  ) => {
    try {
      const res = await fetch('/api/assignments/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to update lock status');
      }
      return payload;
    } catch {
      return rejectWithValue('Failed to update lock status');
    }
  }
);

const assignmentsSlice = createSlice({
  name: 'assignments',
  initialState,
  reducers: {
    /** Optimistic single worker lock toggle */
    setWorkerLocked(state, action: PayloadAction<{ workerId: string; isLocked: boolean }>) {
      const { workerId, isLocked } = action.payload;
      const w = state.allWorkers.find(w => w.id === workerId);
      if (w) w.isLocked = isLocked;
      state.assignments = state.assignments.map(a =>
        a.workerId === workerId ? { ...a, worker: { ...a.worker, isLocked } } : a
      );
      if (isLocked) {
        state.availableWorkers = state.availableWorkers.filter(w => w.id !== workerId);
      } else {
        const worker = state.allWorkers.find(w => w.id === workerId);
        if (worker && !state.availableWorkers.find(w => w.id === workerId)) {
          state.availableWorkers.push({ ...worker, isLocked: false });
        }
      }
    },

    /** Optimistic bulk worker lock toggle */
    setBulkWorkersLocked(state, action: PayloadAction<{ workerIds: string[]; isLocked: boolean }>) {
      const { workerIds, isLocked } = action.payload;
      state.allWorkers = state.allWorkers.map(w =>
        workerIds.includes(w.id) ? { ...w, isLocked } : w
      );
      state.assignments = state.assignments.map(a =>
        workerIds.includes(a.workerId) ? { ...a, worker: { ...a.worker, isLocked } } : a
      );
      if (isLocked) {
        state.availableWorkers = state.availableWorkers.filter(w => !workerIds.includes(w.id));
      } else {
        const toAdd = state.allWorkers.filter(
          w => workerIds.includes(w.id) && !state.availableWorkers.find(aw => aw.id === w.id)
        );
        state.availableWorkers.push(...toAdd.map(w => ({ ...w, isLocked: false })));
      }
    },

    /** Optimistic car lock toggle */
    setCarLocked(state, action: PayloadAction<{ carId: string; isLocked: boolean }>) {
      const { carId, isLocked } = action.payload;
      state.allCars = state.allCars.map(c => c.id === carId ? { ...c, isLocked } : c);
    },

    /** Remove a single assignment from state (after delete) */
    removeAssignment(state, action: PayloadAction<string>) {
      const id = action.payload;
      const removed = state.assignments.find(a => a.id === id);
      state.assignments = state.assignments.filter(a => a.id !== id);
      // If worker was locked, unlock them in state
      if (removed?.worker?.isLocked) {
        const w = state.allWorkers.find(w => w.id === removed.workerId);
        if (w) {
          w.isLocked = false;
          if (!state.availableWorkers.find(aw => aw.id === w.id)) {
            state.availableWorkers.push({ ...w, isLocked: false });
          }
        }
      }
    },

    /** Remove multiple assignments from state (after bulk delete) */
    removeAssignments(state, action: PayloadAction<string[]>) {
      const ids = new Set(action.payload);
      const removed = state.assignments.filter(a => ids.has(a.id));
      state.assignments = state.assignments.filter(a => !ids.has(a.id));
      // Unlock any locked workers whose assignments were removed
      removed.forEach(a => {
        if (a.worker?.isLocked) {
          const w = state.allWorkers.find(w => w.id === a.workerId);
          if (w) {
            w.isLocked = false;
            if (!state.availableWorkers.find(aw => aw.id === w.id)) {
              state.availableWorkers.push({ ...w, isLocked: false });
            }
          }
        }
      });
    },

    /** Add new assignments to state (after create) */
    addAssignments(state, action: PayloadAction<Assignment[]>) {
      const incoming = action.payload;
      incoming.forEach(a => {
        if (!state.assignments.find(ex => ex.id === a.id)) {
          state.assignments.push(a);
        }
      });
    },

    /** Optimistic day-off toggle */
    setWorkerDayOff(state, action: PayloadAction<{ workerId: string; isOnDayOff: boolean }>) {
      const { workerId, isOnDayOff } = action.payload;
      if (isOnDayOff) {
        if (!state.workersOnDayOff.includes(workerId)) state.workersOnDayOff.push(workerId);
        state.availableWorkers = state.availableWorkers.filter(w => w.id !== workerId);
      } else {
        state.workersOnDayOff = state.workersOnDayOff.filter(id => id !== workerId);
        const worker = state.allWorkers.find(w => w.id === workerId);
        if (worker && !worker.isLocked && !state.availableWorkers.find(w => w.id === workerId)) {
          state.availableWorkers.push(worker);
        }
      }
    },

    clearError(state) { state.error = null; },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignmentsData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAssignmentsData.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(fetchAssignmentsData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder.addCase(fetchDailyProgramThunk.fulfilled, (state, action) => {
      state.workersOnDayOff = action.payload;
    });

    // lockEntities: apply optimistically via reducers, this just handles rejection
    builder.addCase(lockEntities.rejected, (state, action) => {
      state.error = action.payload as string;
    });
  },
});

export const {
  setWorkerLocked,
  setBulkWorkersLocked,
  setCarLocked,
  setWorkerDayOff,
  removeAssignment,
  removeAssignments,
  addAssignments,
  clearError,
} = assignmentsSlice.actions;

export default assignmentsSlice.reducer;
