import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Client {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  idNumber: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientsState {
  byId: Record<string, Client>;
  allIds: string[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  filters: { search: string; status: string };
}

const initialState: ClientsState = {
  byId: {},
  allIds: [],
  isLoading: false,
  isInitialized: false,
  error: null,
  filters: { search: '', status: 'all' },
};

export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/clients', { credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed to fetch clients');
      const data = await res.json();
      return data.clients as Client[];
    } catch {
      return rejectWithValue('Failed to fetch clients');
    }
  }
);

export const createClient = createAsyncThunk(
  'clients/createClient',
  async (clientData: Record<string, any>, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(clientData),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to create client');
      }
      const data = await res.json();
      return data.client as Client;
    } catch {
      return rejectWithValue('Failed to create client');
    }
  }
);

export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, data }: { id: string; data: Record<string, any> }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to update client');
      }
      const result = await res.json();
      return result.client as Client;
    } catch {
      return rejectWithValue('Failed to update client');
    }
  }
);

export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to delete client');
      }
      return id;
    } catch {
      return rejectWithValue('Failed to delete client');
    }
  }
);

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setSearchFilter(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
    },
    setStatusFilter(state, action: PayloadAction<string>) {
      state.filters.status = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchClients.fulfilled, (state, action) => {
        const byId: Record<string, Client> = {};
        const allIds: string[] = [];
        action.payload.forEach((c) => { byId[c.id] = c; allIds.push(c.id); });
        state.byId = byId;
        state.allIds = allIds;
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder.addCase(createClient.fulfilled, (state, action) => {
      const c = action.payload;
      if (c?.id) { state.byId[c.id] = c; state.allIds.unshift(c.id); }
    });

    builder.addCase(updateClient.fulfilled, (state, action) => {
      const c = action.payload;
      if (c?.id) state.byId[c.id] = c;
    });

    builder.addCase(deleteClient.fulfilled, (state, action) => {
      const id = action.payload;
      delete state.byId[id];
      state.allIds = state.allIds.filter((i) => i !== id);
    });
  },
});

export const { setSearchFilter, setStatusFilter, clearError } = clientsSlice.actions;
export default clientsSlice.reducer;
