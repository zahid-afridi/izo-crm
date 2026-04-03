import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface SiteManager {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
}

export interface Client {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  status: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  city?: string;
  postalCode?: string;
  client?: string;
  clientId?: string;
  startDate: string;
  estimatedEndDate?: string;
  actualEndDate?: string;
  status: string;
  progress: number;
  progressNotes?: string;
  progressUpdatedAt?: string;
  assignedWorkers: number;
  totalAssignments?: number;
  siteManagerId?: string;
  siteManager?: SiteManager;
  workers?: any[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SitesState {
  byId: Record<string, Site>;
  allIds: string[];
  managers: SiteManager[];
  clients: Client[];
  isLoading: boolean;
  isInitialized: boolean;
  isLoadingManagers: boolean;
  isLoadingClients: boolean;
  error: string | null;
  filters: { search: string; status: string };
}

const initialState: SitesState = {
  byId: {},
  allIds: [],
  managers: [],
  clients: [],
  isLoading: false,
  isInitialized: false,
  isLoadingManagers: false,
  isLoadingClients: false,
  error: null,
  filters: { search: '', status: 'all' },
};

let pendingFetch: Promise<any> | null = null;

export const fetchSites = createAsyncThunk(
  'sites/fetchSites',
  async (params: { search?: string; status?: string } | undefined, { rejectWithValue }) => {
    if (pendingFetch) return pendingFetch;
    try {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.status && params.status !== 'all') query.append('status', params.status);
      const req = fetch(`/api/sites?${query.toString()}`, { credentials: 'include' });
      pendingFetch = req;
      const res = await req;
      pendingFetch = null;
      if (!res.ok) return rejectWithValue('Failed to fetch sites');
      const data = await res.json();
      return JSON.parse(JSON.stringify(data));
    } catch (e) {
      pendingFetch = null;
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to fetch sites');
    }
  }
);

export const fetchSiteManagers = createAsyncThunk(
  'sites/fetchManagers',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/sites/managers', { credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed to fetch managers');
      const data = await res.json();
      return data.managers || [];
    } catch (e) {
      return rejectWithValue('Failed to fetch managers');
    }
  }
);

export const fetchClients = createAsyncThunk(
  'sites/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/clients', { credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed to fetch clients');
      const data = await res.json();
      return data.clients || [];
    } catch (e) {
      return rejectWithValue('Failed to fetch clients');
    }
  }
);

export const createSite = createAsyncThunk(
  'sites/createSite',
  async (siteData: Record<string, any>, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(siteData),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to create site');
      }
      const data = await res.json();
      return JSON.parse(JSON.stringify(data.site));
    } catch (e) {
      return rejectWithValue('Failed to create site');
    }
  }
);

export const updateSite = createAsyncThunk(
  'sites/updateSite',
  async ({ id, data }: { id: string; data: Record<string, any> }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/sites/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to update site');
      }
      const result = await res.json();
      return JSON.parse(JSON.stringify(result.site));
    } catch (e) {
      return rejectWithValue('Failed to update site');
    }
  }
);

export const patchSiteStatus = createAsyncThunk(
  'sites/patchStatus',
  async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/sites/${id}`, {
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

export const deleteSite = createAsyncThunk(
  'sites/deleteSite',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/sites/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to delete site');
      }
      return id;
    } catch (e) {
      return rejectWithValue('Failed to delete site');
    }
  }
);

const sitesSlice = createSlice({
  name: 'sites',
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
    // Optimistic status update
    optimisticStatusUpdate: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const { id, status } = action.payload;
      if (state.byId[id]) {
        state.byId[id].status = status;
        if (status === 'completed') state.byId[id].progress = 100;
      }
    },
  },
  extraReducers: (builder) => {
    // fetchSites
    builder
      .addCase(fetchSites.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchSites.fulfilled, (state, action) => {
        const sites: Site[] = action.payload.sites || [];
        const newById: Record<string, Site> = {};
        const newAllIds: string[] = [];
        sites.forEach((s) => { newById[s.id] = s; newAllIds.push(s.id); });
        state.byId = newById;
        state.allIds = newAllIds;
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(fetchSites.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchSiteManagers
    builder
      .addCase(fetchSiteManagers.pending, (state) => { state.isLoadingManagers = true; })
      .addCase(fetchSiteManagers.fulfilled, (state, action) => {
        state.managers = action.payload;
        state.isLoadingManagers = false;
      })
      .addCase(fetchSiteManagers.rejected, (state) => { state.isLoadingManagers = false; });

    // fetchClients
    builder
      .addCase(fetchClients.pending, (state) => { state.isLoadingClients = true; })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.clients = action.payload;
        state.isLoadingClients = false;
      })
      .addCase(fetchClients.rejected, (state) => { state.isLoadingClients = false; });

    // createSite
    builder
      .addCase(createSite.fulfilled, (state, action) => {
        const site = action.payload;
        if (site?.id) {
          state.byId[site.id] = site;
          state.allIds.unshift(site.id);
        }
      });

    // updateSite
    builder
      .addCase(updateSite.fulfilled, (state, action) => {
        const site = action.payload;
        if (site?.id) state.byId[site.id] = site;
      });

    // patchSiteStatus
    builder
      .addCase(patchSiteStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        if (state.byId[id]) {
          state.byId[id].status = status;
          if (status === 'completed') state.byId[id].progress = 100;
        }
      })
      .addCase(patchSiteStatus.rejected, (state, action) => {
        // Revert optimistic update on failure - will be handled by re-fetch
        state.error = action.payload as string;
      });

    // deleteSite
    builder
      .addCase(deleteSite.fulfilled, (state, action) => {
        const id = action.payload;
        delete state.byId[id];
        state.allIds = state.allIds.filter((i) => i !== id);
      });
  },
});

export const { setSearchFilter, setStatusFilter, clearError, optimisticStatusUpdate } = sitesSlice.actions;
export default sitesSlice.reducer;
