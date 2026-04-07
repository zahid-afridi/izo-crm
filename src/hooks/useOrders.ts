'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  setSearchFilter,
  setStatusFilter,
  clearError,
  type Order,
} from '@/store/slices/ordersSlice';
import {
  selectAllOrders,
  selectFilteredOrders,
  selectOrdersIsLoading,
  selectOrdersIsInitialized,
  selectOrdersError,
  selectOrderStats,
  selectOrdersFilters,
} from '@/store/selectors/ordersSelectors';

export function useOrders() {
  const dispatch = useAppDispatch();

  const allOrders = useAppSelector(selectAllOrders);
  const filteredOrders = useAppSelector(selectFilteredOrders);
  const isLoading = useAppSelector(selectOrdersIsLoading);
  const isInitialized = useAppSelector(selectOrdersIsInitialized);
  const error = useAppSelector(selectOrdersError);
  const stats = useAppSelector(selectOrderStats);
  const filters = useAppSelector(selectOrdersFilters);

  const handleFetchOrders = (params?: { status?: string; assignedTo?: string }) =>
    dispatch(fetchOrders(params));

  const handleCreateOrder = async (orderData: Record<string, any>) => {
    const result = await dispatch(createOrder(orderData));
    if (createOrder.fulfilled.match(result)) return result.payload;
    throw new Error(result.payload as string);
  };

  const handleUpdateOrder = async (id: string, data: Record<string, any>) => {
    const result = await dispatch(updateOrder({ id, data }));
    if (updateOrder.fulfilled.match(result)) return result.payload;
    throw new Error(result.payload as string);
  };

  const handleDeleteOrder = async (id: string) => {
    const result = await dispatch(deleteOrder(id));
    if (deleteOrder.fulfilled.match(result)) return result.payload;
    throw new Error(result.payload as string);
  };

  return {
    allOrders,
    filteredOrders,
    isLoading,
    isInitialized,
    error,
    stats,
    filters,
    fetchOrders: handleFetchOrders,
    createOrder: handleCreateOrder,
    updateOrder: handleUpdateOrder,
    deleteOrder: handleDeleteOrder,
    setSearchFilter: (search: string) => dispatch(setSearchFilter(search)),
    setStatusFilter: (status: string) => dispatch(setStatusFilter(status)),
    clearError: () => dispatch(clearError()),
  };
}

export type { Order };
