import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkerProfile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string | null;
  profile: string | null;
  worker: {
    employeeType: string;
    hourlyRate: number | null;
    monthlyRate: number | null;
  } | null;
}

export interface Assignment {
  id: string;
  siteId: string;
  assignedDate: string;
  status: string;
  notes: string | null;
  showAssignmentHistory?: boolean;
  site: {
    id: string;
    name: string;
    address: string;
    city: string | null;
  };
  car: {
    id: string;
    name: string;
    number: string;
    color: string;
    model: string;
  } | null;
}

export interface Attendance {
  id: string;
  assignmentId: string;
  checkInTime: string;
  checkOutTime: string | null;
  notes: string | null;
  checkInLat?: number;
  checkInLng?: number;
  checkOutLat?: number;
  checkOutLng?: number;
}

export interface AttendanceHistory {
  history: Attendance[];
  summary: {
    totalRecords: number;
    totalHours: number;
    totalMinutes: number;
    totalTimeFormatted: string;
  };
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  teamLead: {
    id: string;
    fullName: string;
    username: string;
    phone: string | null;
    email: string;
  };
  members: Array<{
    id: string;
    fullName: string;
    username: string;
    phone: string | null;
    email: string;
    role: string;
  }>;
}

export interface WorkerProfileStats {
  totalAssignments: number;
  thisMonthDays: number;
  teamsCount: number;
}

export interface WorkerProfileState {
  profile: WorkerProfile | null;
  todayAssignments: Assignment[];
  pastAssignments: Assignment[];
  stats: WorkerProfileStats;
  teams: Team[];
  // attendance keyed by assignmentId
  attendanceMap: Record<string, Attendance>;
  // attendance history keyed by assignmentId
  attendanceHistoryMap: Record<string, AttendanceHistory>;
  isLoading: boolean;
  isInitialized: boolean;
  checkingIn: string | null;
  checkingOut: string | null;
  error: string | null;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: WorkerProfileState = {
  profile: null,
  todayAssignments: [],
  pastAssignments: [],
  stats: { totalAssignments: 0, thisMonthDays: 0, teamsCount: 0 },
  teams: [],
  attendanceMap: {},
  attendanceHistoryMap: {},
  isLoading: false,
  isInitialized: false,
  checkingIn: null,
  checkingOut: null,
  error: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchWorkerProfile = createAsyncThunk(
  'workerProfile/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const [profileRes, attendanceRes] = await Promise.all([
        fetch('/api/workers/profile', { credentials: 'include' }),
        fetch(`/api/attendance?date=${format(new Date(), 'yyyy-MM-dd')}`, { credentials: 'include' }),
      ]);

      if (!profileRes.ok) return rejectWithValue('Failed to fetch worker profile');

      const profileData = await profileRes.json();
      let attendanceMap: Record<string, Attendance> = {};

      if (attendanceRes.ok) {
        const attData = await attendanceRes.json();
        if (attData.attendance?.length > 0) {
          const groups: Record<string, Attendance[]> = {};
          attData.attendance.forEach((att: Attendance) => {
            if (!groups[att.assignmentId]) groups[att.assignmentId] = [];
            groups[att.assignmentId].push(att);
          });
          Object.entries(groups).forEach(([assignmentId, records]) => {
            const sorted = [...records].sort(
              (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
            );
            attendanceMap[assignmentId] = sorted[0];
          });
        }
      }

      return { profileData: JSON.parse(JSON.stringify(profileData)), attendanceMap };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch profile');
    }
  }
);

export const fetchAttendanceHistory = createAsyncThunk(
  'workerProfile/fetchAttendanceHistory',
  async (assignmentId: string, { rejectWithValue }) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const res = await fetch(`/api/attendance/history?assignmentId=${assignmentId}&date=${today}`, {
        credentials: 'include',
      });
      if (!res.ok) return rejectWithValue('Failed to fetch attendance history');
      const data = await res.json();
      return { assignmentId, data: JSON.parse(JSON.stringify(data)) };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch history');
    }
  }
);

export const checkIn = createAsyncThunk(
  'workerProfile/checkIn',
  async (
    { assignmentId, latitude, longitude }: { assignmentId: string; latitude?: number; longitude?: number },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const body: Record<string, unknown> = { assignmentId };
      if (latitude !== undefined) body.latitude = latitude;
      if (longitude !== undefined) body.longitude = longitude;

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to check in');
      }

      const data = await res.json();
      dispatch(fetchAttendanceHistory(assignmentId));
      return { assignmentId, attendance: JSON.parse(JSON.stringify(data.attendance)) };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to check in');
    }
  }
);

export const checkOut = createAsyncThunk(
  'workerProfile/checkOut',
  async (
    {
      assignmentId,
      attendanceId,
      latitude,
      longitude,
    }: { assignmentId: string; attendanceId: string; latitude?: number; longitude?: number },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const body: Record<string, unknown> = { attendanceId };
      if (latitude !== undefined) body.latitude = latitude;
      if (longitude !== undefined) body.longitude = longitude;

      const res = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error || 'Failed to check out');
      }

      const data = await res.json();
      dispatch(fetchAttendanceHistory(assignmentId));
      return { assignmentId, attendance: JSON.parse(JSON.stringify(data.attendance)) };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to check out');
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const workerProfileSlice = createSlice({
  name: 'workerProfile',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchWorkerProfile
    builder
      .addCase(fetchWorkerProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkerProfile.fulfilled, (state, action) => {
        const { profileData, attendanceMap } = action.payload;
        state.profile = profileData.profile ?? null;
        state.todayAssignments = profileData.todayAssignments ?? [];
        state.pastAssignments = profileData.pastAssignments ?? [];
        state.stats = profileData.stats ?? initialState.stats;
        state.teams = profileData.teams ?? [];
        state.attendanceMap = attendanceMap;
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(fetchWorkerProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchAttendanceHistory
    builder
      .addCase(fetchAttendanceHistory.fulfilled, (state, action) => {
        const { assignmentId, data } = action.payload as { assignmentId: string; data: AttendanceHistory };
        state.attendanceHistoryMap[assignmentId] = data;
      });

    // checkIn
    builder
      .addCase(checkIn.pending, (state, action) => {
        state.checkingIn = action.meta.arg.assignmentId;
        state.error = null;
      })
      .addCase(checkIn.fulfilled, (state, action) => {
        const { assignmentId, attendance } = action.payload;
        state.attendanceMap[assignmentId] = attendance;
        state.checkingIn = null;
      })
      .addCase(checkIn.rejected, (state, action) => {
        state.checkingIn = null;
        state.error = action.payload as string;
      });

    // checkOut
    builder
      .addCase(checkOut.pending, (state, action) => {
        state.checkingOut = action.meta.arg.assignmentId;
        state.error = null;
      })
      .addCase(checkOut.fulfilled, (state, action) => {
        const { assignmentId, attendance } = action.payload;
        state.attendanceMap[assignmentId] = attendance;
        state.checkingOut = null;
      })
      .addCase(checkOut.rejected, (state, action) => {
        state.checkingOut = null;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = workerProfileSlice.actions;
export default workerProfileSlice.reducer;
