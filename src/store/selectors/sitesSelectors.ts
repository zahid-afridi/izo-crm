import { RootState } from '../store';

export const selectSitesById = (state: RootState) => state.sites.byId;
export const selectSitesAllIds = (state: RootState) => state.sites.allIds;
export const selectSitesIsLoading = (state: RootState) => state.sites.isLoading;
export const selectSitesIsInitialized = (state: RootState) => state.sites.isInitialized;
export const selectSitesError = (state: RootState) => state.sites.error;
export const selectSitesFilters = (state: RootState) => state.sites.filters;
export const selectSiteManagers = (state: RootState) => state.sites.managers;
export const selectSiteClients = (state: RootState) => state.sites.clients;
export const selectSitesLoadingManagers = (state: RootState) => state.sites.isLoadingManagers;
export const selectSitesLoadingClients = (state: RootState) => state.sites.isLoadingClients;

export const selectAllSites = (state: RootState) =>
  state.sites.allIds.map((id) => state.sites.byId[id]);

export const selectSiteById = (id: string) => (state: RootState) =>
  state.sites.byId[id];

export const selectFilteredSites = (state: RootState) => {
  const { search, status } = state.sites.filters;
  return state.sites.allIds
    .map((id) => state.sites.byId[id])
    .filter((site) => {
      const matchesSearch =
        !search ||
        site.name.toLowerCase().includes(search.toLowerCase()) ||
        site.address.toLowerCase().includes(search.toLowerCase()) ||
        (site.client?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesStatus = status === 'all' || site.status === status;
      return matchesSearch && matchesStatus;
    });
};

export const selectSiteStats = (state: RootState) => {
  const sites = state.sites.allIds.map((id) => state.sites.byId[id]);
  return {
    total: sites.length,
    active: sites.filter((s) => s.status === 'active').length,
    pending: sites.filter((s) => s.status === 'pending').length,
    closed: sites.filter((s) => s.status === 'closed').length,
  };
};
