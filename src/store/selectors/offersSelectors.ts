import { RootState } from '../store';

export const selectOffersIsLoading = (state: RootState) => state.offers.isLoading;
export const selectOffersIsInitialized = (state: RootState) => state.offers.isInitialized;
export const selectOffersError = (state: RootState) => state.offers.error;
export const selectOffersFilters = (state: RootState) => state.offers.filters;

export const selectAllOffers = (state: RootState) =>
  state.offers.allIds.map((id) => state.offers.byId[id]);

export const selectOfferById = (id: string) => (state: RootState) =>
  state.offers.byId[id];

export const selectFilteredOffers = (state: RootState) => {
  const { search, status } = state.offers.filters;
  return state.offers.allIds
    .map((id) => state.offers.byId[id])
    .filter((offer) => {
      const matchesSearch =
        !search ||
        offer.client.toLowerCase().includes(search.toLowerCase()) ||
        offer.title.toLowerCase().includes(search.toLowerCase()) ||
        offer.offerNumber.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === 'all' || offer.offerStatus === status;
      return matchesSearch && matchesStatus;
    });
};

export const selectOfferStats = (state: RootState) => {
  const offers = state.offers.allIds.map((id) => state.offers.byId[id]);
  return {
    total: offers.length,
    sent: offers.filter((o) => o.offerStatus === 'sent').length,
    accepted: offers.filter((o) => o.offerStatus === 'accepted').length,
    rejected: offers.filter((o) => o.offerStatus === 'rejected').length,
    draft: offers.filter((o) => o.offerStatus === 'draft').length,
  };
};
