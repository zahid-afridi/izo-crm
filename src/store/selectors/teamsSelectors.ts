import { RootState } from '../store';

export const selectTeamsIsLoading = (state: RootState) => state.teams.isLoading;
export const selectTeamsIsInitialized = (state: RootState) => state.teams.isInitialized;
export const selectTeamsError = (state: RootState) => state.teams.error;
export const selectTeamsFilters = (state: RootState) => state.teams.filters;
export const selectTeamWorkers = (state: RootState) => state.teams.workers;
export const selectTeamsLoadingWorkers = (state: RootState) => state.teams.isLoadingWorkers;

export const selectAllTeams = (state: RootState) =>
  state.teams.allIds.map((id) => state.teams.byId[id]);

export const selectFilteredTeams = (state: RootState) => {
  const { search, status } = state.teams.filters;
  return state.teams.allIds
    .map((id) => state.teams.byId[id])
    .filter((team) => {
      const matchesSearch =
        !search ||
        team.name.toLowerCase().includes(search.toLowerCase()) ||
        team.teamLead.fullName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === 'all' || team.status === status;
      return matchesSearch && matchesStatus;
    });
};

export const selectTeamStats = (state: RootState) => {
  const teams = state.teams.allIds.map((id) => state.teams.byId[id]);
  return {
    total: teams.length,
    active: teams.filter((t) => t.status === 'active').length,
    totalWorkers: teams.reduce((sum, t) => sum + t.memberCount, 0),
  };
};
