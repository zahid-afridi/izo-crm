import { RootState } from '../store';

export const selectAssignments = (state: RootState) => state.assignments.assignments;
export const selectAllWorkers = (state: RootState) => state.assignments.allWorkers;
export const selectAvailableWorkers = (state: RootState) => state.assignments.availableWorkers;
export const selectAllCars = (state: RootState) => state.assignments.allCars;
export const selectAllSites = (state: RootState) => state.assignments.allSites;
export const selectAllTeams = (state: RootState) => state.assignments.allTeams;
export const selectWorkersOnDayOff = (state: RootState) => state.assignments.workersOnDayOff;
export const selectAssignmentsIsLoading = (state: RootState) => state.assignments.isLoading;
export const selectAssignmentsIsInitialized = (state: RootState) => state.assignments.isInitialized;
