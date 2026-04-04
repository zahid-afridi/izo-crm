import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Car {
  id: string;
  name: string;
  number: string;
  color: string;
  model: string;
  status: string;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CarsState {
  byId: Record<string, Car>;
  allIds: string[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  filters: { search: string; status: string };
}

const initialState: CarsState = {
  byId: {},
  allIds: [],
  isLoading: false,
  isInitialized: false,
  error: null,
  filters: { search: '', status: 'all' },
};

export const fetchCars = createAsyncThunk(
  'cars/fetchCars',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/cars', { credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed to fetch cars');
      const data = await res.json();
      return data.cars as Car[];
    } catch (e) {
      return rejectWithValue('Failed to fetch cars');
    }
  }
);

export const createCar = createAsyncThunk(
  'cars/createCar',
  async (carData: Record<string, any>, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(carData),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to create car');
      }
      const data = await res.json();
      return data.car as Car;
    } catch (e) {
      return rejectWithValue('Failed to create car');
    }
  }
);

export const updateCar = createAsyncThunk(
  'cars/updateCar',
  async ({ id, data }: { id: string; data: Record<string, any> }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/cars/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to update car');
      }
      const result = await res.json();
      return result.car as Car;
    } catch (e) {
      return rejectWithValue('Failed to update car');
    }
  }
);

export const patchCarStatus = createAsyncThunk(
  'cars/patchStatus',
  async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/cars/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to update status');
      }
      return { id, status };
    } catch (e) {
      return rejectWithValue('Failed to update status');
    }
  }
);

export const deleteCar = createAsyncThunk(
  'cars/deleteCar',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/cars/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to delete car');
      }
      return id;
    } catch (e) {
      return rejectWithValue('Failed to delete car');
    }
  }
);

const carsSlice = createSlice({
  name: 'cars',
  initialState,
  reducers: {
    setSearchFilter: (state, action: PayloadAction<string>) => {
      state.filters.search = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.filters.status = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    optimisticStatusUpdate: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const { id, status } = action.payload;
      if (state.byId[id]) state.byId[id].status = status;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCars.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchCars.fulfilled, (state, action) => {
        const byId: Record<string, Car> = {};
        const allIds: string[] = [];
        action.payload.forEach((c) => { byId[c.id] = c; allIds.push(c.id); });
        state.byId = byId;
        state.allIds = allIds;
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(fetchCars.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder.addCase(createCar.fulfilled, (state, action) => {
      const car = action.payload;
      if (car?.id) { state.byId[car.id] = car; state.allIds.unshift(car.id); }
    });

    builder.addCase(updateCar.fulfilled, (state, action) => {
      const car = action.payload;
      if (car?.id) state.byId[car.id] = car;
    });

    builder
      .addCase(patchCarStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        if (state.byId[id]) state.byId[id].status = status;
      })
      .addCase(patchCarStatus.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder.addCase(deleteCar.fulfilled, (state, action) => {
      const id = action.payload;
      delete state.byId[id];
      state.allIds = state.allIds.filter((i) => i !== id);
    });
  },
});

export const { setSearchFilter, setStatusFilter, clearError, optimisticStatusUpdate } = carsSlice.actions;
export default carsSlice.reducer;
