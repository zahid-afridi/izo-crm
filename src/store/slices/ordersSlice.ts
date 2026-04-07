import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Order {
  id: string;
  orderNumber: string;
  orderTitle?: string;
  client: string;
  clientId?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  assignedToId?: string;
  assignedTo?: string;
  items: any[];
  notes?: string;
  paymentMethod?: string;
  deliveryMethod?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  deliveryCost: number;
  currency?: string;
  subtotal: number;
  createdAt: string;
}

export interface OrdersState {
  byId: Record<string, Order>;
  allIds: string[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  filters: {
    search: string;
    status: string;
  };
}

const initialState: OrdersState = {
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

export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (params: { status?: string; assignedTo?: string } | undefined, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (params?.status && params.status !== 'all') query.append('status', params.status);
      if (params?.assignedTo) query.append('assignedTo', params.assignedTo);
      const response = await fetch(`/api/orders?${query.toString()}`, { credentials: 'include' });
      if (!response.ok) return rejectWithValue('Failed to fetch orders');
      const data = await response.json();
      return data.orders as Order[];
    } catch {
      return rejectWithValue('Failed to fetch orders');
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData: Record<string, any>, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const err = await response.json();
        return rejectWithValue(err.error || 'Failed to create order');
      }
      const data = await response.json();
      return data.order as Order;
    } catch {
      return rejectWithValue('Failed to create order');
    }
  }
);

export const updateOrder = createAsyncThunk(
  'orders/updateOrder',
  async ({ id, data }: { id: string; data: Record<string, any> }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        return rejectWithValue(err.error || 'Failed to update order');
      }
      const result = await response.json();
      return result.order as Order;
    } catch {
      return rejectWithValue('Failed to update order');
    }
  }
);

export const deleteOrder = createAsyncThunk(
  'orders/deleteOrder',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json();
        return rejectWithValue(err.error || 'Failed to delete order');
      }
      return id;
    } catch {
      return rejectWithValue('Failed to delete order');
    }
  }
);

const ordersSlice = createSlice({
  name: 'orders',
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
      .addCase(fetchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.byId = {};
        state.allIds = [];
        for (const order of action.payload) {
          state.byId[order.id] = order;
          state.allIds.push(order.id);
        }
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        const order = action.payload;
        state.byId[order.id] = order;
        state.allIds.unshift(order.id);
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(updateOrder.fulfilled, (state, action) => {
        const order = action.payload;
        state.byId[order.id] = order;
      })
      .addCase(updateOrder.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteOrder.fulfilled, (state, action) => {
        const id = action.payload;
        delete state.byId[id];
        state.allIds = state.allIds.filter((i) => i !== id);
      })
      .addCase(deleteOrder.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setSearchFilter, setStatusFilter, clearError } = ordersSlice.actions;
export default ordersSlice.reducer;
