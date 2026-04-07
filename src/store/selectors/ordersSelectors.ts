import { RootState } from '../store';

export const selectOrdersIsLoading = (state: RootState) => state.orders.isLoading;
export const selectOrdersIsInitialized = (state: RootState) => state.orders.isInitialized;
export const selectOrdersError = (state: RootState) => state.orders.error;
export const selectOrdersFilters = (state: RootState) => state.orders.filters;

export const selectAllOrders = (state: RootState) =>
  state.orders.allIds.map((id) => state.orders.byId[id]);

export const selectOrderById = (id: string) => (state: RootState) =>
  state.orders.byId[id];

export const selectFilteredOrders = (state: RootState) => {
  const { search, status } = state.orders.filters;
  return state.orders.allIds
    .map((id) => state.orders.byId[id])
    .filter((order) => {
      const matchesSearch =
        !search ||
        order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        order.client.toLowerCase().includes(search.toLowerCase()) ||
        (order.orderTitle?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesStatus = status === 'all' || order.orderStatus === status;
      return matchesSearch && matchesStatus;
    });
};

export const selectOrderStats = (state: RootState) => {
  const orders = state.orders.allIds.map((id) => state.orders.byId[id]);
  return {
    total: orders.length,
    pending: orders.filter((o) => o.orderStatus === 'pending').length,
    processing: orders.filter((o) => o.orderStatus === 'processing').length,
    completed: orders.filter((o) => o.orderStatus === 'completed').length,
    cancelled: orders.filter((o) => o.orderStatus === 'cancelled').length,
    unassigned: orders.filter((o) => !o.assignedTo).length,
  };
};
