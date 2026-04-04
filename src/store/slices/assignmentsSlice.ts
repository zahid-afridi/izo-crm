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

export const fetchAssignmentsData = createAsyncThunk(
  'assignments/fetchAll',
  async (selectedDate: string | undefined, { rejectWithValue }) => {
    try {
      const bySiteUrl = selectedDate
        ? `/api/assignments/by-site?date=${selectedDate}`
        : `/api/assignments/by-site`;

      const dateParam = selectedDate || new Date().toISOString().split('T')[0];

      const [bySiteRes, availableRes, carsRes, sitesRes, teamsRes, allWorkersRes, dailyProgramRes] = await Promise.all([
        fetch(bySiteUrl, { credentials: 'include' }),
        fetch('/api/assignments/available?role=worker', { credentials: 'include' }),
        fetch('/api/cars', { credentials: 'include' }),
        fetch('/api/sites', { credentials: 'include' }),
        fetch('/api/teams', { credentials: 'include' }),
        fetch('/api/workers?role=worker', { credentials: 'include' }),
        fetch(`/api/daily-program?date=${dateParam}`, { credentials: 'include' }),
      ]);

      if (!bySiteRes.ok || !availableRes.ok || !carsRes.ok || !sitesRes.ok || !teamsRes.ok || !allWorkersRes.ok) {
        return rejectWithValue('Failed to fetch assignments data');
      }

      const [bySiteData, availableData, carsData, sitesData, teamsData, allWorkersData, dailyProgramData] = await Promise.all([
        bySiteRes.json(),
        availableRes.json(),
        carsRes.json(),
        sitesRes.json(),
        teamsRes.json(),
        allWorkersRes.json(),
        dailyProgramRes.ok ? dailyProgramRes.json() : Promise.resolve({ workersOnDayOff: [] }),
      ]);

      // Flatten by-site data into assignments array
      const flatAssignments: Assignment[] = [];
      (bySiteData.assignments || []).forEach((siteData: any) => {
        siteData.workers.forEach((worker: any) => {
          flatAssignments.push({
            id: worker.id,
            siteId: siteData.id,
            workerId: worker.workerId,
            carId: worker.car?.id || null,
            assignedDate: worker.assignedDate,
            status: worker.status,
            notes: worker.notes,
            showAssignmentHistory: worker.showAssignmentHistory ?? false,
            createdAt: worker.createdAt,
            site: {
              id: siteData.id,
              name: siteData.name,
              address: siteData.address,
              city: siteData.city,
              status: siteData.siteStatus || 'active',
              isCompleted: siteData.isCompleted || false,
            },
            worker: {
              id: worker.workerId,
              fullName: worker.workerName,
              email: worker.workerEmail,
              phone: worker.workerPhone,
              role: worker.workerRole,
              isLocked: worker.workerIsLocked,
            },
            car: worker.car ? {
              id: worker.car.id,
              name: worker.car.name,
              number: worker.car.number,
              color: worker.car.color,
              model: worker.car.model,
              status: worker.car.status || 'active',
              isLocked: worker.car.isLocked || false,
            } : undefined,
          });
        });
      });

      return {
        assignments: flatAssignments,
        allWorkers: allWorkersData.workers || [],
        availableWorkers: availableData.workers || [],
        allCars: carsData.cars || [],
        allSites: sitesData.sites || [],
        allTeams: teamsData.teams || [],
        workersOnDayOff: dailyProgramData.workersOnDayOff || [],
      };
    } catch (e) {
      return rejectWithValue('Failed to fetch assignments data');
    }
  }
);

export const fetchDailyProgramThunk = createAsyncThunk(
  'assignments/fetchDailyProgram',
  async (date: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/daily-program?date=${date}`, { credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed to fetch daily program');
      const data = await res.json();
      return data.workersOnDayOff as string[];
    } catch {
      return rejectWithValue('Failed to fetch daily program');
    }
  }
);

const assignmentsSlice = createSlice({
  name: 'assignments',
  initialState,
  reducers: {
    // Optimistic worker lock update
    setWorkerLocked: (state, action: PayloadAction<{ workerId: string; isLocked: boolean }>) => {
      const { workerId, isLocked } = action.payload;
      const worker = state.allWorkers.find(w => w.id === workerId);
      if (worker) worker.isLocked = isLocked;
      state.assignments = state.assignments.map(a =>
        a.workerId === workerId ? { ...a, worker: { ...a.worker, isLocked } } : a
      );
      if (isLocked) {
        state.availableWorkers = state.availableWorkers.filter(w => w.id !== workerId);
      } else {
        const w = state.allWorkers.find(w => w.id === workerId);
        if (w && !state.availableWorkers.find(aw => aw.id === workerId)) {
          state.availableWorkers.push({ ...w, isLocked: false });
        }
      }
    },
    // Optimistic bulk worker lock update
    setBulkWorkersLocked: (state, action: PayloadAction<{ workerIds: string[]; isLocked: boolean }>) => {
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
        const toAdd = state.allWorkers.filter(w =>
          workerIds.includes(w.id) && !state.availableWorkers.find(aw => aw.id === w.id)
        );
        state.availableWorkers.push(...toAdd.map(w => ({ ...w, isLocked: false })));
      }
    },
    // Optimistic car lock update
    setCarLocked: (state, action: PayloadAction<{ carId: string; isLocked: boolean }>) => {
      const { carId, isLocked } = action.payload;
      state.allCars = state.allCars.map(c => c.id === carId ? { ...c, isLocked } : c);
    },
    // Optimistic day-off toggle
    setWorkerDayOff: (state, action: PayloadAction<{ workerId: string; isOnDayOff: boolean }>) => {
      const { workerId, isOnDayOff } = action.payload;
      if (isOnDayOff) {
        if (!state.workersOnDayOff.includes(workerId)) state.workersOnDayOff.push(workerId);
      } else {
        state.workersOnDayOff = state.workersOnDayOff.filter(id => id !== workerId);
      }
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignmentsData.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchAssignmentsData.fulfilled, (state, action) => {
        state.assignments = action.payload.assignments;
        state.allWorkers = action.payload.allWorkers;
        state.availableWorkers = action.payload.availableWorkers;
        state.allCars = action.payload.allCars;
        state.allSites = action.payload.allSites;
        state.allTeams = action.payload.allTeams;
        state.workersOnDayOff = action.payload.workersOnDayOff;
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(fetchAssignmentsData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchDailyProgramThunk.fulfilled, (state, action) => {
        state.workersOnDayOff = action.payload;
      });
  },
});

export const { setWorkerLocked, setBulkWorkersLocked, setCarLocked, setWorkerDayOff, clearError } = assignmentsSlice.actions;
export default assignmentsSlice.reducer;
