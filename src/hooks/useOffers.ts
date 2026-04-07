'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  setSearchFilter,
  setStatusFilter,
  clearError,
  type Offer,
} from '@/store/slices/offersSlice';
import {
  selectAllOffers,
  selectFilteredOffers,
  selectOffersIsLoading,
  selectOffersIsInitialized,
  selectOffersError,
  selectOfferStats,
  selectOffersFilters,
  selectOfferById,
} from '@/store/selectors/offersSelectors';

export function useOffers() {
  const dispatch = useAppDispatch();

  const allOffers = useAppSelector(selectAllOffers);
  const filteredOffers = useAppSelector(selectFilteredOffers);
  const isLoading = useAppSelector(selectOffersIsLoading);
  const isInitialized = useAppSelector(selectOffersIsInitialized);
  const error = useAppSelector(selectOffersError);
  const stats = useAppSelector(selectOfferStats);
  const filters = useAppSelector(selectOffersFilters);

  const handleFetchOffers = (params?: { status?: string }) =>
    dispatch(fetchOffers(params));

  const handleCreateOffer = async (offerData: Record<string, any>) => {
    const result = await dispatch(createOffer(offerData));
    if (createOffer.fulfilled.match(result)) return result.payload;
    throw new Error(result.payload as string);
  };

  const handleUpdateOffer = async (id: string, data: Record<string, any>) => {
    const result = await dispatch(updateOffer({ id, data }));
    if (updateOffer.fulfilled.match(result)) return result.payload;
    throw new Error(result.payload as string);
  };

  const handleDeleteOffer = async (id: string) => {
    const result = await dispatch(deleteOffer(id));
    if (deleteOffer.fulfilled.match(result)) return result.payload;
    throw new Error(result.payload as string);
  };

  return {
    allOffers,
    filteredOffers,
    isLoading,
    isInitialized,
    error,
    stats,
    filters,
    fetchOffers: handleFetchOffers,
    createOffer: handleCreateOffer,
    updateOffer: handleUpdateOffer,
    deleteOffer: handleDeleteOffer,
    setSearchFilter: (search: string) => dispatch(setSearchFilter(search)),
    setStatusFilter: (status: string) => dispatch(setStatusFilter(status)),
    clearError: () => dispatch(clearError()),
    getOfferById: (id: string) => useAppSelector(selectOfferById(id)),
  };
}

export type { Offer };
