import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface OfferItem {
  type: 'product' | 'service' | 'package';
  itemId: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  [key: string]: any;
}

export interface Offer {
  id: string;
  offerNumber: string;
  client: string;
  clientId?: string;
  title: string;
  description?: string;
  offerDate: string;
  validUntil?: string | null;
  offerStatus: string;
  /** Set by API: draft, sent, accepted, rejected, expired (sent + past validUntil) */
  effectiveStatus?: string;
  currency: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  validityPeriod?: string;
  notes?: string;
  items: OfferItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OffersState {
  byId: Record<string, Offer>;
  allIds: string[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  filters: {
    search: string;
    status: string;
  };
}

const initialState: OffersState = {
  byId: {},
  allIds: [],
  isLoading: false,
  isInitialized: false,
  error: null,
  filters: {
    search: '',
    status: 'all',
  },
};

export const fetchOffers = createAsyncThunk(
  'offers/fetchOffers',
  async (params: { status?: string } | undefined, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (params?.status && params.status !== 'all') query.append('status', params.status);
      const response = await fetch(`/api/offers?${query.toString()}`, { credentials: 'include' });
      if (!response.ok) return rejectWithValue('Failed to fetch offers');
      const data = await response.json();
      return data.offers as Offer[];
    } catch {
      return rejectWithValue('Failed to fetch offers');
    }
  }
);

export const createOffer = createAsyncThunk(
  'offers/createOffer',
  async (offerData: Record<string, any>, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(offerData),
      });
      if (!response.ok) {
        const err = await response.json();
        return rejectWithValue(err.error || 'Failed to create offer');
      }
      const data = await response.json();
      return data.offer as Offer;
    } catch {
      return rejectWithValue('Failed to create offer');
    }
  }
);

export const updateOffer = createAsyncThunk(
  'offers/updateOffer',
  async ({ id, data }: { id: string; data: Record<string, any> }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/offers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        return rejectWithValue(err.error || 'Failed to update offer');
      }
      const result = await response.json();
      return result.offer as Offer;
    } catch {
      return rejectWithValue('Failed to update offer');
    }
  }
);

export const deleteOffer = createAsyncThunk(
  'offers/deleteOffer',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/offers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json();
        return rejectWithValue(err.error || 'Failed to delete offer');
      }
      return id;
    } catch {
      return rejectWithValue('Failed to delete offer');
    }
  }
);

const offersSlice = createSlice({
  name: 'offers',
  initialState,
  reducers: {
    setSearchFilter(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
    },
    setStatusFilter(state, action: PayloadAction<string>) {
      state.filters.status = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchOffers
      .addCase(fetchOffers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.byId = {};
        state.allIds = [];
        for (const offer of action.payload) {
          state.byId[offer.id] = offer;
          state.allIds.push(offer.id);
        }
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // createOffer
      .addCase(createOffer.fulfilled, (state, action) => {
        const offer = action.payload;
        state.byId[offer.id] = offer;
        state.allIds.unshift(offer.id);
      })
      .addCase(createOffer.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // updateOffer
      .addCase(updateOffer.fulfilled, (state, action) => {
        const offer = action.payload;
        state.byId[offer.id] = offer;
      })
      .addCase(updateOffer.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // deleteOffer
      .addCase(deleteOffer.fulfilled, (state, action) => {
        const id = action.payload;
        delete state.byId[id];
        state.allIds = state.allIds.filter((i) => i !== id);
      })
      .addCase(deleteOffer.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setSearchFilter, setStatusFilter, clearError } = offersSlice.actions;
export default offersSlice.reducer;
