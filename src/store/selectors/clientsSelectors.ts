import { RootState } from '../store';

export const selectClientsIsLoading = (state: RootState) => state.clients.isLoading;
export const selectClientsIsInitialized = (state: RootState) => state.clients.isInitialized;
export const selectClientsFilters = (state: RootState) => state.clients.filters;

export const selectAllClients = (state: RootState) =>
  state.clients.allIds.map((id) => state.clients.byId[id]);

export const selectFilteredClients = (state: RootState) => {
  const { search, status } = state.clients.filters;
  return state.clients.allIds
    .map((id) => state.clients.byId[id])
    .filter((c) => {
      const matchesSearch =
        !search ||
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone?.includes(search) ?? false);
      const matchesStatus = status === 'all' || c.status === status;
      return matchesSearch && matchesStatus;
    });
};

export const selectClientStats = (state: RootState) => {
  const clients = state.clients.allIds.map((id) => state.clients.byId[id]);
  return {
    total: clients.length,
    active: clients.filter((c) => c.status === 'active').length,
    inactive: clients.filter((c) => c.status === 'inactive').length,
  };
};
