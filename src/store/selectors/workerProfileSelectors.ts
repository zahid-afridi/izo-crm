import { RootState } from '../store';

export const selectWorkerProfile = (state: RootState) => state.workerProfile.profile;
export const selectWorkerProfileStats = (state: RootState) => state.workerProfile.stats;
export const selectWorkerProfileTeams = (state: RootState) => state.workerProfile.teams;
export const selectTodayAssignments = (state: RootState) => state.workerProfile.todayAssignments;
export const selectPastAssignments = (state: RootState) => state.workerProfile.pastAssignments;
export const selectAttendanceMap = (state: RootState) => state.workerProfile.attendanceMap;
export const selectAttendanceHistoryMap = (state: RootState) => state.workerProfile.attendanceHistoryMap;
export const selectWorkerProfileIsLoading = (state: RootState) => state.workerProfile.isLoading;
export const selectWorkerProfileIsInitialized = (state: RootState) => state.workerProfile.isInitialized;
export const selectWorkerProfileError = (state: RootState) => state.workerProfile.error;
export const selectCheckingIn = (state: RootState) => state.workerProfile.checkingIn;
export const selectCheckingOut = (state: RootState) => state.workerProfile.checkingOut;

export const selectAttendanceForAssignment = (assignmentId: string) => (state: RootState) =>
  state.workerProfile.attendanceMap[assignmentId] ?? null;

export const selectAttendanceHistoryForAssignment = (assignmentId: string) => (state: RootState) =>
  state.workerProfile.attendanceHistoryMap[assignmentId] ?? null;

export const selectFirstAttendance = (state: RootState) => {
  const values = Object.values(state.workerProfile.attendanceMap);
  return values.length > 0 ? values[0] : null;
};
