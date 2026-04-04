import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Worker {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

export interface TeamLead {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  teamLeadId: string;
  teamLead: TeamLead;
  memberIds: string[];
  members: TeamMember[];
  memberCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamsState {
  byId: Record<string, Team>;
  allIds: string[];
  workers: Worker[];
  isLoading: boolean;
  isInitialized: boolean;
  isLoadingWorkers: boolean;
  error: string | null;
  filters: { search: string; status: string };
}

const initialState: TeamsState = {
  byId: {},
  allIds: [],
  workers: [],
  isLoading: false,
  isInitialized: false,
  isLoadingWorkers: false,
  error: null,
  filters: { search: '', status: 'all' },
};

export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/teams', { credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed to fetch teams');
      const data = await res.json();
      return data.teams as Team[];
    } catch (e) {
      return rejectWithValue('Failed to fetch teams');
    }
  }
);

export const fetchTeamWorkers = createAsyncThunk(
  'teams/fetchWorkers',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/teams/workers', { credentials: 'include' });
      if (!res.ok) return rejectWithValue('Failed to fetch workers');
      const data = await res.json();
      return data.workers as Worker[];
    } catch (e) {
      return rejectWithValue('Failed to fetch workers');
    }
  }
);

export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async (teamData: Record<string, any>, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(teamData),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to create team');
      }
      const data = await res.json();
      return data.team as Team;
    } catch (e) {
      return rejectWithValue('Failed to create team');
    }
  }
);

export const updateTeam = createAsyncThunk(
  'teams/updateTeam',
  async ({ id, data }: { id: string; data: Record<string, any> }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to update team');
      }
      const result = await res.json();
      return result.team as Team;
    } catch (e) {
      return rejectWithValue('Failed to update team');
    }
  }
);

export const deleteTeam = createAsyncThunk(
  'teams/deleteTeam',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to delete team');
      }
      return id;
    } catch (e) {
      return rejectWithValue('Failed to delete team');
    }
  }
);

const teamsSlice = createSlice({
  name: 'teams',
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        const byId: Record<string, Team> = {};
        const allIds: string[] = [];
        action.payload.forEach((t) => { byId[t.id] = t; allIds.push(t.id); });
        state.byId = byId;
        state.allIds = allIds;
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchTeamWorkers.pending, (state) => { state.isLoadingWorkers = true; })
      .addCase(fetchTeamWorkers.fulfilled, (state, action) => {
        state.workers = action.payload;
        state.isLoadingWorkers = false;
      })
      .addCase(fetchTeamWorkers.rejected, (state) => { state.isLoadingWorkers = false; });

    builder.addCase(createTeam.fulfilled, (state, action) => {
      const team = action.payload;
      if (team?.id) { state.byId[team.id] = team; state.allIds.unshift(team.id); }
    });

    builder.addCase(updateTeam.fulfilled, (state, action) => {
      const team = action.payload;
      if (team?.id) state.byId[team.id] = team;
    });

    builder.addCase(deleteTeam.fulfilled, (state, action) => {
      const id = action.payload;
      delete state.byId[id];
      state.allIds = state.allIds.filter((i) => i !== id);
    });
  },
});

export const { setSearchFilter, setStatusFilter, clearError } = teamsSlice.actions;
export default teamsSlice.reducer;
