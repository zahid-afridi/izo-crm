"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrders } from '@/hooks/useOrders';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Search, MoreVertical, Eye, Edit, Trash2, Download, Package, Truck, CheckCircle, Clock, XCircle, Loader, ChevronUp, ChevronDown, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { OrderExportDialog } from './OrderExportDialog';
import { OfficeEmployeeOrdersPage } from './OfficeEmployeeOrdersPage';
import { toast } from 'sonner';

interface OrdersPageProps {
  userRole: string;
  userId?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  orderTitle?: string; // Add order title field
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
  currency?: string; // Add currency field
  subtotal: number;
  createdAt: string;
}

export function OrdersPage({ userRole, userId }: OrdersPageProps) {
  const { t } = useTranslation();
  // If user is office employee, show the specialized interface
  if (userRole === 'office_employee' && userId) {
    return <OfficeEmployeeOrdersPage userRole={userRole} userId={userId} />;
  }
  const {
    allOrders: orders,
    isLoading,
    isInitialized,
    fetchOrders: dispatchFetchOrders,
    createOrder: dispatchCreateOrder,
    updateOrder: dispatchUpdateOrder,
    deleteOrder: dispatchDeleteOrder,
  } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<string>(''); // Add sorting field
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // Add sorting direction
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkAssigneeId, setBulkAssigneeId] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTab, setCurrentTab] = useState('details'); // Add tab state
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({}); // Add validation errors state
  const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state for form submission
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null); // Add loading state for status updates
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number; openUpward: boolean } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [trackingClientFilter, setTrackingClientFilter] = useState('all');
  const [trackingMonthFilter, setTrackingMonthFilter] = useState('all');
  const [trackingYearFilter, setTrackingYearFilter] = useState('all');
  const [isTrackingExpanded, setIsTrackingExpanded] = useState(false);
  const [formData, setFormData] = useState({
    client: '',
    clientId: '',
    orderTitle: '', // Add order title field
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    orderStatus: 'pending',
    paymentStatus: 'pending',
    paymentMethod: '',
    deliveryMethod: '',
    deliveryAddress: '',
    deliveryInstructions: '',
    deliveryCost: '',
    assignedToId: '',
    assignedTo: '',
    notes: '',
    currency: 'eur', // Add currency field
  });
  const [items, setItems] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);

  // Function to get currency symbol
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'usd':
        return '$';
      case 'all':
        return 'Lek';
      case 'eur':
      default:
        return '€';
    }
  };

  useEffect(() => {
    if (!isInitialized) dispatchFetchOrders({ status: statusFilter });
    fetchClients();
    fetchProducts();
    fetchServices();
    fetchPackages();
    fetchUsers();
  }, []);

  useEffect(() => {
    dispatchFetchOrders({ status: statusFilter });
  }, [statusFilter]);

  useEffect(() => {
    calculateTotals();
  }, [items, formData.deliveryCost]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        closeDropdown();
      }
    };

    const handleScroll = () => {
      if (openDropdownId) {
        closeDropdown();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openDropdownId) {
        closeDropdown();
      }
    };

    const handleResize = () => {
      if (openDropdownId) {
        closeDropdown();
      }
    };

    if (openDropdownId) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [openDropdownId]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      setAvailableClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setAvailableProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      const data = await response.json();
      setAvailableServices(data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/service-packages');
      const data = await response.json();
      setAvailablePackages(data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?role=office_employee');
      const data = await response.json();
      setAvailableUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const calculateTotals = () => {
    const sub = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const deliveryCost = parseFloat(formData.deliveryCost) || 0;
    const totalAmount = sub + deliveryCost;

    setSubtotal(sub);
    setTotal(totalAmount);
  };

  // Tab navigation functions
  const tabs = ['details', 'items', 'delivery'];
  const tabLabels = {
    details: 'Order Details',
    items: 'Order Items',
    delivery: 'Delivery & Payment'
  };

  const handleNextTab = () => {
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex < tabs.length - 1) {
      setCurrentTab(tabs[currentIndex + 1]);
    }
  };

  const handlePreviousTab = () => {
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex > 0) {
      setCurrentTab(tabs[currentIndex - 1]);
    }
  };

  const isLastTab = currentTab === tabs[tabs.length - 1];
  const isFirstTab = currentTab === tabs[0];

  const validateCurrentTab = () => {
    const errors: { [key: string]: string } = {};

    switch (currentTab) {
      case 'details':
        if (!formData.client) {
          errors.client = 'Client is required';
        }
        break;
      case 'items':
        if (items.length === 0) {
          errors.items = 'At least one item is required';
        }
        break;
      case 'delivery':
        if (!formData.deliveryAddress.trim()) {
          errors.deliveryAddress = 'Delivery address is required';
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTabAction = () => {
    if (isLastTab) {
      // Create order on last tab
      if (isEditMode) {
        handleUpdateOrder();
      } else {
        handleCreateOrder();
      }
    } else {
      // Validate current tab and move to next
      if (validateCurrentTab()) {
        handleNextTab();
        setValidationErrors({}); // Clear errors when moving to next tab
      } else {
        // Show validation error message
        toast.error('Please fill in all required fields before proceeding');
      }
    }
  };

  const canEdit = ['admin', 'sales_agent', 'order_manager', 'office_employee'].includes(userRole);
  const canDelete = userRole === 'admin';

  // Sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return (
        <div className="flex flex-col ml-1 opacity-40">
          <ChevronUp className="w-3 h-3 -mb-1" />
          <ChevronDown className="w-3 h-3" />
        </div>
      );
    }
    return (
      <div className="ml-1">
        {sortDirection === 'asc' ?
          <ChevronUp className="w-4 h-4 text-blue-600" /> :
          <ChevronDown className="w-4 h-4 text-blue-600" />
        }
      </div>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.orderTitle && order.orderTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || order.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'orderTitle':
        aValue = (a.orderTitle || '').toLowerCase();
        bValue = (b.orderTitle || '').toLowerCase();
        break;
      case 'client':
        aValue = a.client.toLowerCase();
        bValue = b.client.toLowerCase();
        break;
      case 'orderDate':
        aValue = new Date(a.orderDate);
        bValue = new Date(b.orderDate);
        break;
      case 'totalAmount':
        aValue = a.totalAmount;
        bValue = b.totalAmount;
        break;
      case 'paymentStatus':
        aValue = a.paymentStatus.toLowerCase();
        bValue = b.paymentStatus.toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleCreateOrder = async () => {
    // Validate required fields
    const errors: { [key: string]: string } = {};

    if (!formData.client) {
      errors.client = 'Client is required';
      toast.error('Please select a client');
    }

    if (!formData.deliveryAddress.trim()) {
      errors.deliveryAddress = 'Delivery address is required';
      toast.error('Please enter a delivery address');
    }

    if (formData.orderDate && formData.expectedDeliveryDate && formData.expectedDeliveryDate < formData.orderDate) {
      errors.expectedDeliveryDate = 'Expected delivery date cannot be earlier than order date';
      toast.error('Expected delivery date cannot be earlier than order date');
    }

    // Allow orders with no items (service-only orders or manual orders)
    // if (items.length === 0) {
    //   errors.items = 'Please add at least one item to the order';
    //   toast.error('Please add at least one item to the order');
    // }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Go back to the first tab with errors
      if (errors.client || errors.expectedDeliveryDate) {
        setCurrentTab('details');
      } else if (errors.deliveryAddress) {
        setCurrentTab('delivery');
      }
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        clientId: formData.clientId,
        client: formData.client,
        orderTitle: formData.orderTitle,
        orderDate: formData.orderDate,
        expectedDeliveryDate: formData.expectedDeliveryDate,
        orderStatus: formData.orderStatus,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod,
        deliveryMethod: formData.deliveryMethod,
        deliveryAddress: formData.deliveryAddress,
        deliveryInstructions: formData.deliveryInstructions,
        deliveryCost: parseFloat(formData.deliveryCost) || 0,
        currency: formData.currency,
        subtotal,
        totalAmount: total,
        notes: formData.notes,
        assignedToId: formData.assignedToId,
        items,
      };

      try {
        await dispatchCreateOrder(payload);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success('Order created successfully!');
      } catch (err: any) {
        toast.error(err.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOrder = async () => {
    // Validate required fields
    const errors: { [key: string]: string } = {};

    if (!formData.client) {
      errors.client = 'Client is required';
      toast.error('Please select a client');
    }

    if (!formData.deliveryAddress.trim()) {
      errors.deliveryAddress = 'Delivery address is required';
      toast.error('Please enter a delivery address');
    }

    if (formData.orderDate && formData.expectedDeliveryDate && formData.expectedDeliveryDate < formData.orderDate) {
      errors.expectedDeliveryDate = 'Expected delivery date cannot be earlier than order date';
      toast.error('Expected delivery date cannot be earlier than order date');
    }

    if (!editingOrderId || !total) {
      return;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Go back to the first tab with errors
      if (errors.client || errors.expectedDeliveryDate) {
        setCurrentTab('details');
      } else if (errors.deliveryAddress) {
        setCurrentTab('delivery');
      }
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        clientId: formData.clientId,
        client: formData.client,
        orderTitle: formData.orderTitle,
        orderDate: formData.orderDate,
        expectedDeliveryDate: formData.expectedDeliveryDate,
        orderStatus: formData.orderStatus,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod,
        deliveryMethod: formData.deliveryMethod,
        deliveryAddress: formData.deliveryAddress,
        deliveryInstructions: formData.deliveryInstructions,
        deliveryCost: parseFloat(formData.deliveryCost) || 0,
        currency: formData.currency,
        subtotal,
        totalAmount: total,
        notes: formData.notes,
        assignedToId: formData.assignedToId,
        items,
      };

      try {
        await dispatchUpdateOrder(editingOrderId, payload);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success('Order updated successfully!');
      } catch (err: any) {
        toast.error(err.message || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedOrder) return;
    try {
      await dispatchDeleteOrder(selectedOrder.id);
      setIsDeleteConfirmOpen(false);
      setSelectedOrder(null);
      toast.success('Order deleted successfully');
    } catch (err: any) {
      if (err.message?.includes('not found')) {
        dispatchFetchOrders({ status: statusFilter });
        setIsDeleteConfirmOpen(false);
        setSelectedOrder(null);
        toast.error('Order not found - it may have been already deleted');
      } else {
        toast.error(err.message || 'Failed to delete order');
      }
    }
  };

  const handleAssignOrder = async () => {
    if (!selectedOrder || !selectedAssigneeId) {
      toast.error('Please select an office employee to assign the order to');
      return;
    }

    try {
      await dispatchUpdateOrder(selectedOrder.id, {
        assignedToId: selectedAssigneeId === 'unassign' ? null : selectedAssigneeId,
      });
      setIsAssignDialogOpen(false);
      setSelectedOrder(null);
      setSelectedAssigneeId('');
      const assigneeName = selectedAssigneeId === 'unassign'
        ? 'Unassigned'
        : availableUsers.find(u => u.id === selectedAssigneeId)?.fullName || 'Unknown';
      toast.success(`Order ${selectedOrder.orderNumber} ${selectedAssigneeId === 'unassign' ? 'unassigned' : `assigned to ${assigneeName}`}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign order');
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssigneeId) {
      toast.error('Please select an office employee');
      return;
    }

    const unassignedOrders = orders.filter(order => !order.assignedTo);
    if (unassignedOrders.length === 0) {
      toast.error('No unassigned orders found');
      return;
    }

    try {
      await Promise.all(
        unassignedOrders.map(order => dispatchUpdateOrder(order.id, { assignedToId: bulkAssigneeId }))
      );
      setIsBulkAssignOpen(false);
      setBulkAssigneeId('');
      const assigneeName = availableUsers.find(u => u.id === bulkAssigneeId)?.fullName || 'Unknown';
      toast.success(`${unassignedOrders.length} orders assigned to ${assigneeName}`);
    } catch (error) {
      console.error('Error bulk assigning orders:', error);
      toast.error('Failed to assign orders');
    }
  };

  const handleQuickStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setStatusUpdatingId(orderId);
      await dispatchUpdateOrder(orderId, { orderStatus: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Download invoice function
  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/download`);

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `order-${orderId}-invoice.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const handleEditOrder = (order: Order) => {
    setIsEditMode(true);
    setEditingOrderId(order.id);
    setFormData({
      client: order.client,
      clientId: order.clientId || '',
      orderTitle: order.orderTitle || '', // Add order title
      orderDate: order.orderDate.split('T')[0],
      expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.split('T')[0] : '',
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod || '',
      deliveryMethod: order.deliveryMethod || '',
      deliveryAddress: order.deliveryAddress || '',
      deliveryInstructions: order.deliveryInstructions || '',
      deliveryCost: order.deliveryCost.toString(),
      assignedToId: order.assignedToId || '',
      assignedTo: order.assignedTo || '',
      notes: order.notes || '',
      currency: order.currency || 'eur', // Add currency field
    });
    setItems(order.items || []);
    setClientSearchQuery(''); // Reset client search
    setIsClientDropdownOpen(false); // Close client dropdown
    setIsCreateDialogOpen(true);
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      client: '',
      clientId: '',
      orderTitle: '', // Add order title
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      orderStatus: 'pending',
      paymentStatus: 'pending',
      paymentMethod: '',
      deliveryMethod: '',
      deliveryAddress: '',
      deliveryInstructions: '',
      deliveryCost: '',
      assignedToId: '',
      assignedTo: '',
      notes: '',
      currency: 'eur', // Add currency field
    });
    setItems([]);
    setSubtotal(0);
    setTotal(0);
    setCurrentTab('details');
    setIsEditMode(false);
    setEditingOrderId(null);
    setValidationErrors({});
    setIsSubmitting(false);
    setClientSearchQuery(''); // Reset client search
    setIsClientDropdownOpen(false); // Close client dropdown
  };

  const handleDropdownToggle = (orderId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (openDropdownId === orderId) {
      setOpenDropdownId(null);
      setDropdownPosition(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownHeight = 200; // Approximate height of dropdown (more items in orders)
      const dropdownWidth = 160; // Width of dropdown
      const padding = 8; // Minimum padding from viewport edges

      // Check if dropdown should open upward
      const spaceBelow = viewportHeight - rect.bottom - padding;
      const spaceAbove = rect.top - padding;
      const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight;

      // Calculate vertical position
      let top;
      if (shouldOpenUpward) {
        top = rect.top - dropdownHeight;
      } else {
        top = rect.bottom;
      }

      // Ensure dropdown doesn't go off-screen vertically
      if (top < padding) {
        top = padding;
      } else if (top + dropdownHeight > viewportHeight - padding) {
        top = viewportHeight - dropdownHeight - padding;
      }

      // Calculate horizontal position (prefer right-aligned)
      let right = viewportWidth - rect.right;

      // Ensure dropdown doesn't go off-screen horizontally
      if (right < padding) {
        // Not enough space on the right, try left-aligned
        right = viewportWidth - rect.left - dropdownWidth;
        if (right < padding) {
          // Still not enough space, center it with minimum padding
          right = padding;
        }
      }

      setDropdownPosition({
        top,
        right: Math.max(padding, right),
        openUpward: shouldOpenUpward
      });
      setOpenDropdownId(orderId);
    }
  };

  const closeDropdown = () => {
    setOpenDropdownId(null);
    setDropdownPosition(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; labelKey: string; className?: string }> = {
      pending: { variant: 'secondary', icon: Clock, labelKey: 'pending', className: 'bg-yellow-100 text-yellow-800' },
      processing: { variant: 'default', icon: Package, labelKey: 'processing', className: 'bg-blue-100 text-blue-800' },
      ready: { variant: 'default', icon: CheckCircle, labelKey: 'ready', className: 'bg-cyan-100 text-cyan-800' },
      shipped: { variant: 'default', icon: Truck, labelKey: 'shipped', className: 'bg-brand-100 text-brand-700' },
      delivered: { variant: 'default', icon: CheckCircle, labelKey: 'delivered', className: 'bg-green-100 text-green-800' },
      cancelled: { variant: 'secondary', icon: XCircle, labelKey: 'cancelled', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} hover:${config.className} flex items-center gap-1 min-w-fit text-xs px-2 py-1`}>
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="whitespace-nowrap">{t(`orders.${config.labelKey}`)}</span>
      </Badge>
    );
  };

  // Simplified status badge for dropdown items (no background colors)
  const getDropdownStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: any; labelKey: string; color: string }> = {
      pending: { icon: Clock, labelKey: 'pending', color: 'text-yellow-600' },
      processing: { icon: Package, labelKey: 'processing', color: 'text-blue-600' },
      ready: { icon: CheckCircle, labelKey: 'ready', color: 'text-cyan-600' },
      shipped: { icon: Truck, labelKey: 'shipped', color: 'text-purple-600' },
      delivered: { icon: CheckCircle, labelKey: 'delivered', color: 'text-green-600' },
      cancelled: { icon: XCircle, labelKey: 'cancelled', color: 'text-red-600' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 ${config.color}`}>
        <Icon className="w-4 h-4" />
        <span>{t(`orders.${config.labelKey}`)}</span>
      </div>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const labelMap: Record<string, string> = {
      paid: t('orders.paid'),
      pending: t('orders.pending'),
      overdue: t('orders.overdue'),
      refunded: t('orders.refunded'),
      partial: t('orders.partial'),
    };
    const label = labelMap[status] || status;
    const classMap: Record<string, string> = {
      paid: 'bg-green-100 text-green-800 hover:bg-green-100',
      pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      overdue: 'bg-red-100 text-red-800 hover:bg-red-100',
      refunded: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    };
    const badgeClass = classMap[status];
    if (badgeClass) {
      return <Badge className={badgeClass}>{label}</Badge>;
    }
    return <Badge variant="outline">{label}</Badge>;
  };

  return (
    <div className="space-y-6 relative">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('orders.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value);
          }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('orders.allStatus')}</SelectItem>
              <SelectItem value="pending">{t('orders.pending')}</SelectItem>
              <SelectItem value="processing">{t('orders.processing')}</SelectItem>
              <SelectItem value="ready">{t('orders.ready')}</SelectItem>
              <SelectItem value="shipped">{t('orders.shipped')}</SelectItem>
              <SelectItem value="delivered">{t('orders.delivered')}</SelectItem>
              <SelectItem value="cancelled">{t('orders.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            {t('orders.exportReport')}
          </Button>

          {(userRole === 'admin' || userRole === 'order_manager') && (
            <Button variant="outline" onClick={() => setIsBulkAssignOpen(true)}>
              <User className="w-4 h-4 mr-2" />
              {t('orders.bulkAssign')}
            </Button>
          )}

          {canEdit && (
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              if (!isSubmitting) {
                setIsCreateDialogOpen(open);
                if (open) {
                  resetForm(); // Reset form and tab when opening
                }
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('orders.createOrder')}
                </Button>
              </DialogTrigger>
              <DialogContent className="!max-w-[98vw] !w-[98vw] max-h-[95vh] overflow-y-auto p-8 sm:!max-w-[98vw]">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {isEditMode ? t('orders.editOrder') : t('orders.createNewOrder')}
                      {isSubmitting && <Loader className="w-4 h-4 animate-spin text-blue-600" />}
                    </span>
                    {isLastTab && items.length > 0 && (
                      <span className="text-lg font-semibold text-blue-600">
                        {t('orders.total')}: {getCurrencySymbol(formData.currency)}{total.toFixed(2)}
                      </span>
                    )}
                    {isLastTab && (!formData.client || items.length === 0) && (
                      <span className="text-sm text-red-600">
                        {!formData.client ? t('orders.pleaseSelectClient') : t('orders.pleaseAddItems')}
                      </span>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-6">
                  <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-12">
                      <TabsTrigger value="details" className="text-base">{t('orders.orderDetails')}</TabsTrigger>
                      <TabsTrigger value="items" className="text-base">{t('orders.orderItems')}</TabsTrigger>
                      <TabsTrigger value="delivery" className="text-base">{t('orders.deliveryPayment')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="col-span-full">
                          <Label className="text-base font-medium">{t('orders.client')} <span className="text-red-500">*</span></Label>
                          <div className="relative">
                            <Input
                              placeholder={t('orders.searchAndSelectClient')}
                              value={clientSearchQuery || formData.client}
                              onChange={(e) => {
                                setClientSearchQuery(e.target.value);
                                setIsClientDropdownOpen(true);
                                // Clear selection if user is typing
                                if (e.target.value !== formData.client) {
                                  setFormData({
                                    ...formData,
                                    clientId: '',
                                    client: ''
                                  });
                                }
                              }}
                              onFocus={() => setIsClientDropdownOpen(true)}
                              className={`h-12 ${validationErrors.client ? 'border-red-500' : ''}`}
                            />

                            {/* Searchable Dropdown */}
                            {isClientDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setIsClientDropdownOpen(false)}
                                />
                                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                  {availableClients
                                    .filter(client =>
                                      client.fullName.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                      client.email.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                      (client.phone && client.phone.includes(clientSearchQuery))
                                    )
                                    .map((client) => (
                                      <div
                                        key={client.id}
                                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onClick={() => {
                                          setFormData({
                                            ...formData,
                                            clientId: client.id,
                                            client: client.fullName
                                          });
                                          setClientSearchQuery('');
                                          setIsClientDropdownOpen(false);
                                          // Clear validation error when user selects a client
                                          if (validationErrors.client) {
                                            setValidationErrors({ ...validationErrors, client: '' });
                                          }
                                        }}
                                      >
                                        <div className="font-medium text-gray-900">{client.fullName}</div>
                                        <div className="text-sm text-gray-500">{client.email}</div>
                                        {client.phone && (
                                          <div className="text-sm text-gray-500">{client.phone}</div>
                                        )}
                                      </div>
                                    ))
                                  }
                                  {availableClients
                                    .filter(client =>
                                      client.fullName.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                      client.email.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                      (client.phone && client.phone.includes(clientSearchQuery))
                                    ).length === 0 && clientSearchQuery && (
                                      <div className="px-4 py-3 text-gray-500 text-center">
                                        {t('orders.noClientsFoundMatching', { query: clientSearchQuery })}
                                      </div>
                                    )}
                                </div>
                              </>
                            )}
                          </div>
                          {validationErrors.client && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.client}</p>
                          )}
                        </div>

                        <div className="col-span-full">
                          <Label className="text-base font-medium">{t('orders.orderTitle')}</Label>
                          <Input
                            placeholder={t('orders.orderTitlePlaceholder')}
                            value={formData.orderTitle}
                            onChange={(e) => setFormData({ ...formData, orderTitle: e.target.value })}
                            className="h-12"
                          />
                        </div>

                        <div className="col-span-1 md:col-span-1">
                          <Label className="text-base font-medium">{t('orders.orderDate')}</Label>
                          <Input
                            type="date"
                            value={formData.orderDate}
                            onChange={(e) => {
                              const newOrderDate = e.target.value;
                              const updates: Record<string, string> = { orderDate: newOrderDate };
                              if (formData.expectedDeliveryDate && newOrderDate && formData.expectedDeliveryDate < newOrderDate) {
                                updates.expectedDeliveryDate = '';
                              }
                              setFormData({ ...formData, ...updates });
                            }}
                            className="h-12"
                          />
                        </div>

                        <div className="col-span-1 md:col-span-1">
                          <Label className="text-base font-medium">{t('orders.expectedDeliveryDate')}</Label>
                          <Input
                            type="date"
                            value={formData.expectedDeliveryDate}
                            min={formData.orderDate || undefined}
                            onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                            className="h-12"
                          />
                          {formData.orderDate && formData.expectedDeliveryDate && formData.expectedDeliveryDate < formData.orderDate && (
                            <p className="text-red-500 text-sm mt-1">Expected delivery date cannot be earlier than order date</p>
                          )}
                        </div>

                        <div className="col-span-1 md:col-span-1">
                          <Label className="text-base font-medium">{t('orders.orderStatus')}</Label>
                          <Select value={formData.orderStatus} onValueChange={(value) => setFormData({ ...formData, orderStatus: value })}>
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">{t('orders.pending')}</SelectItem>
                              <SelectItem value="processing">{t('orders.processing')}</SelectItem>
                              <SelectItem value="ready">{t('orders.ready')}</SelectItem>
                              <SelectItem value="shipped">{t('orders.shipped')}</SelectItem>
                              <SelectItem value="delivered">{t('orders.delivered')}</SelectItem>
                              <SelectItem value="cancelled">{t('orders.cancelled')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-1 md:col-span-1">
                          <Label className="text-base font-medium">{t('orders.currency')}</Label>
                          <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="eur">EUR (€)</SelectItem>
                              <SelectItem value="all">ALL (Lek)</SelectItem>
                              <SelectItem value="usd">USD ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-1 md:col-span-1">
                          <Label className="text-base font-medium">{t('orders.assignTo')}</Label>
                          <Select value={formData.assignedToId || 'none'} onValueChange={(value) => {
                            const selectedUser = availableUsers.find(u => u.id === value);
                            setFormData({
                              ...formData,
                              assignedToId: value === 'none' ? '' : value,
                              assignedTo: value === 'none' ? '' : (selectedUser?.fullName || '')
                            });
                          }}>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder={t('orders.selectOfficeEmployeePlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t('orders.noAssignment')}</SelectItem>
                              {availableUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-full">
                          <Label className="text-base font-medium">{t('orders.notes')}</Label>
                          <Textarea
                            placeholder={t('orders.orderNotesPlaceholder')}
                            rows={4}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="resize-none"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="items" className="space-y-6 mt-6">
                      {validationErrors.items && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                          <p className="text-red-600 text-base">{validationErrors.items}</p>
                        </div>
                      )}
                      <Tabs defaultValue="products" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-12">
                          <TabsTrigger value="products" className="text-base">{t('orders.products')}</TabsTrigger>
                          <TabsTrigger value="packages" className="text-base">{t('orders.servicePackages')}</TabsTrigger>
                        </TabsList>

                        {/* Products Tab */}
                        <TabsContent value="products" className="space-y-4 mt-4">
                          <div className="space-y-4">
                            {items.filter(item => item.type === 'product').length > 0 && (
                              <div className="space-y-2">
                                {items.filter(item => item.type === 'product').map((item, index) => {
                                  const itemTotal = (item.quantity * item.unitPrice);
                                  return (
                                    <Card key={index} className="p-6">
                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                        <div className="col-span-1 md:col-span-3">
                                          <Label className="text-sm font-medium">{t('orders.productName')}</Label>
                                          <p className="text-gray-900 font-medium mt-1 text-base">{item.name}</p>
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                          <Label className="text-sm font-medium">{t('orders.quantity')}</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              if (!/^\d*$/.test(value)) return; // Only allow numeric input
                                              const newItems = [...items];
                                              const itemIndex = items.indexOf(item);
                                              newItems[itemIndex].quantity = parseInt(value) || 1;
                                              newItems[itemIndex].total = (parseInt(value) || 1) * newItems[itemIndex].unitPrice;
                                              setItems(newItems);
                                            }}
                                            className="mt-1 h-10"
                                            placeholder={t('orders.enterNumericQuantity')}
                                          />
                                        </div>
                                        <div className="col-span-1 md:col-span-1">
                                          <Label className="text-sm font-medium">{t('orders.unit')}</Label>
                                          <Select
                                            value={item.unit || 'pcs'}
                                            onValueChange={(value) => {
                                              const newItems = [...items];
                                              const itemIndex = items.indexOf(item);
                                              newItems[itemIndex].unit = value;
                                              setItems(newItems);
                                            }}
                                          >
                                            <SelectTrigger className="mt-1 h-10">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="m2">m²</SelectItem>
                                              <SelectItem value="pcs">pcs</SelectItem>
                                              <SelectItem value="kg">kg</SelectItem>
                                              <SelectItem value="l">L</SelectItem>
                                              <SelectItem value="m">m</SelectItem>
                                              <SelectItem value="box">box</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                          <Label className="text-sm font-medium">{t('orders.unitPrice')} ({getCurrencySymbol(formData.currency)})</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unitPrice || 0}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              if (!/^\d*\.?\d*$/.test(value)) return; // Only allow numeric input with decimal
                                              const newItems = [...items];
                                              const itemIndex = items.indexOf(item);
                                              newItems[itemIndex].unitPrice = parseFloat(value) || 0;
                                              newItems[itemIndex].total = newItems[itemIndex].quantity * (parseFloat(value) || 0);
                                              setItems(newItems);
                                            }}
                                            className="mt-1 h-10"
                                            placeholder={t('orders.enterNumericPrices')}
                                          />
                                        </div>
                                        <div className="col-span-1 md:col-span-1">
                                          <Label className="text-sm font-medium">{t('orders.total')}</Label>
                                          <p className="text-gray-900 font-semibold mt-1 text-base">{getCurrencySymbol(formData.currency)}{(item.total || 0).toFixed(2)}</p>
                                        </div>
                                        <div className="col-span-1 md:col-span-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setItems(items.filter((_, i) => i !== items.indexOf(item)))}
                                            className="text-red-600 hover:text-red-700 mt-1 h-10"
                                          >
                                            {t('orders.remove')}
                                          </Button>
                                        </div>
                                      </div>
                                    </Card>
                                  );
                                })}
                              </div>
                            )}

                            <Card className="p-6 bg-gray-50">
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <Label className="text-base font-medium">{t('orders.addProduct')}</Label>
                                  <Select onValueChange={(productId) => {
                                    const product = availableProducts.find(p => p.id === productId);
                                    const isAlreadyAdded = items.some(item => item.type === 'product' && item.id === productId);

                                    if (product && !isAlreadyAdded) {
                                      setItems([...items, {
                                        type: 'product',
                                        id: product.id,
                                        name: product.title,
                                        quantity: 1,
                                        unitPrice: product.price || 0,
                                        total: product.price || 0
                                      }]);
                                      // Clear validation error when item is added
                                      if (validationErrors.items) {
                                        setValidationErrors({ ...validationErrors, items: '' });
                                      }
                                    } else if (isAlreadyAdded) {
                                      alert(t('orders.productAlreadyAdded'));
                                    }
                                  }}>
                                    <SelectTrigger className="h-12">
                                      <SelectValue placeholder={t('orders.selectProduct')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableProducts
                                        .filter(p => !items.some(item => item.type === 'product' && item.id === p.id))
                                        .map((product) => (
                                          <SelectItem key={product.id} value={product.id}>
                                            {product.title} - {getCurrencySymbol(formData.currency)}{product.price?.toFixed(2) || '0.00'}/{product.unit || 'unit'}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </Card>
                          </div>
                        </TabsContent>

                        {/* Service Packages Tab */}
                        <TabsContent value="packages" className="space-y-4 mt-4">
                          <div className="space-y-4">
                            {items.filter(item => item.type === 'package').length > 0 && (
                              <div className="space-y-2">
                                {items.filter(item => item.type === 'package').map((item, index) => (
                                  <Card key={index} className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                      <div className="col-span-1 md:col-span-3">
                                        <Label className="text-sm font-medium">{t('orders.servicePackage')}</Label>
                                        <p className="text-gray-900 font-medium mt-1 text-base">{item.name}</p>
                                      </div>
                                      <div className="col-span-1 md:col-span-2">
                                        <Label className="text-sm font-medium">{t('orders.quantity')}</Label>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={item.quantity || 1}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            if (!/^\d*$/.test(value)) return; // Only allow numeric input
                                            const newItems = [...items];
                                            const itemIndex = items.indexOf(item);
                                            newItems[itemIndex].quantity = parseInt(value) || 1;
                                            newItems[itemIndex].total = (parseInt(value) || 1) * newItems[itemIndex].unitPrice;
                                            setItems(newItems);
                                          }}
                                          className="mt-1 h-10"
                                          placeholder={t('orders.enterNumericQuantity')}
                                        />
                                      </div>
                                      <div className="col-span-1 md:col-span-1">
                                        <Label className="text-sm font-medium">{t('orders.unit')}</Label>
                                        <Select
                                          value={item.unit || 'pcs'}
                                          onValueChange={(value) => {
                                            const newItems = [...items];
                                            const itemIndex = items.indexOf(item);
                                            newItems[itemIndex].unit = value;
                                            setItems(newItems);
                                          }}
                                        >
                                          <SelectTrigger className="mt-1 h-10">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="m2">m²</SelectItem>
                                            <SelectItem value="pcs">pcs</SelectItem>
                                            <SelectItem value="kg">kg</SelectItem>
                                            <SelectItem value="l">L</SelectItem>
                                            <SelectItem value="m">m</SelectItem>
                                            <SelectItem value="box">box</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="col-span-1 md:col-span-2">
                                        <Label className="text-sm font-medium">{t('orders.unitPrice')} ({getCurrencySymbol(formData.currency)})</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={item.unitPrice || 0}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            if (!/^\d*\.?\d*$/.test(value)) return; // Only allow numeric input with decimal
                                            const newItems = [...items];
                                            const itemIndex = items.indexOf(item);
                                            newItems[itemIndex].unitPrice = parseFloat(value) || 0;
                                            newItems[itemIndex].total = (newItems[itemIndex].quantity || 1) * (parseFloat(value) || 0);
                                            setItems(newItems);
                                          }}
                                          className="mt-1 h-10"
                                          placeholder={t('orders.enterNumericPrices')}
                                        />
                                      </div>
                                      <div className="col-span-1 md:col-span-1">
                                        <Label className="text-sm font-medium">{t('orders.total')}</Label>
                                        <p className="text-gray-900 font-semibold mt-1 text-base">{getCurrencySymbol(formData.currency)}{(item.total || 0).toFixed(2)}</p>
                                      </div>
                                      <div className="col-span-1 md:col-span-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setItems(items.filter((_, i) => i !== items.indexOf(item)))}
                                          className="text-red-600 hover:text-red-700 mt-1 h-10"
                                        >
                                          {t('orders.remove')}
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            )}

                            <Card className="p-6 bg-gray-50">
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <Label className="text-base font-medium">{t('orders.addServicePackage')}</Label>
                                  <Select onValueChange={(packageId) => {
                                    const pkg = availablePackages.find(p => p.id === packageId);
                                    const isAlreadyAdded = items.some(item => item.type === 'package' && item.id === packageId);

                                    if (pkg && !isAlreadyAdded) {
                                      setItems([...items, {
                                        type: 'package',
                                        id: pkg.id,
                                        name: pkg.name,
                                        quantity: 1,
                                        unitPrice: pkg.price || 0,
                                        total: pkg.price || 0
                                      }]);
                                      // Clear validation error when item is added
                                      if (validationErrors.items) {
                                        setValidationErrors({ ...validationErrors, items: '' });
                                      }
                                    } else if (isAlreadyAdded) {
                                      alert(t('orders.packageAlreadyAdded'));
                                    }
                                  }}>
                                    <SelectTrigger className="h-12">
                                      <SelectValue placeholder={t('orders.selectServicePackage')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availablePackages
                                        .filter(p => !items.some(item => item.type === 'package' && item.id === p.id))
                                        .map((pkg) => (
                                          <SelectItem key={pkg.id} value={pkg.id}>
                                            {pkg.name} - {getCurrencySymbol(formData.currency)}{pkg.price?.toFixed(2) || '0.00'}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </Card>
                          </div>
                        </TabsContent>
                      </Tabs>

                      <div className="border-t pt-6 mt-6">
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h3 className="text-lg font-semibold mb-4">{t('orders.orderSummary')}</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between text-base">
                              <span className="text-gray-600">{t('orders.subtotal')}:</span>
                              <span className="text-gray-900 font-medium">{getCurrencySymbol(formData.currency)}{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-3 text-xl">
                              <span className="text-gray-900 font-bold">{t('orders.total')}:</span>
                              <span className="text-blue-600 font-bold">{getCurrencySymbol(formData.currency)}{total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="delivery" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="col-span-full">
                          <Label className="text-base font-medium">
                            {t('orders.deliveryAddress')} <span className="text-red-500">*</span>
                          </Label>
                          <Textarea
                            placeholder={t('orders.fullDeliveryAddress')}
                            rows={4}
                            value={formData.deliveryAddress}
                            onChange={(e) => {
                              setFormData({ ...formData, deliveryAddress: e.target.value });
                              // Clear validation error when user starts typing
                              if (validationErrors.deliveryAddress && e.target.value.trim()) {
                                setValidationErrors({ ...validationErrors, deliveryAddress: '' });
                              }
                            }}
                            className={`resize-none ${validationErrors.deliveryAddress ? 'border-red-500 focus:border-red-500' : ''}`}
                          />
                          {validationErrors.deliveryAddress && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.deliveryAddress}</p>
                          )}
                        </div>

                        <div className="col-span-1 md:col-span-1">
                          <Label className="text-base font-medium">{t('orders.deliveryMethod')}</Label>
                          <Select value={formData.deliveryMethod} onValueChange={(value) => setFormData({ ...formData, deliveryMethod: value })}>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder={t('orders.selectMethod')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">{t('orders.standardDelivery')}</SelectItem>
                              <SelectItem value="express">{t('orders.expressDelivery')}</SelectItem>
                              <SelectItem value="pickup">{t('orders.customerPickup')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-1 md:col-span-1">
                          <Label className="text-base font-medium">{t('orders.deliveryCost')} ({getCurrencySymbol(formData.currency)})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.deliveryCost}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!/^\d*\.?\d*$/.test(value)) return; // Only allow numeric input with decimal
                              setFormData({ ...formData, deliveryCost: value });
                            }}
                            className="h-12"
                            placeholder={t('orders.enterNumericPrices')}
                          />
                        </div>

                        <div className="col-span-1 md:col-span-1">
                          <Label className="text-base font-medium">{t('orders.paymentMethod')}</Label>
                          <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder={t('orders.selectMethod')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bank-transfer">{t('orders.bankTransfer')}</SelectItem>
                              <SelectItem value="cash">{t('orders.cash')}</SelectItem>
                              <SelectItem value="credit">{t('orders.credit')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-1 md:col-span-1">
                          <Label className="text-base font-medium">{t('orders.paymentStatus')}</Label>
                          <Select value={formData.paymentStatus} onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}>
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">{t('orders.pending')}</SelectItem>
                              <SelectItem value="paid">{t('orders.paid')}</SelectItem>
                              <SelectItem value="partial">{t('orders.partial')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-full">
                          <Label className="text-base font-medium">{t('orders.deliveryInstructions')}</Label>
                          <Textarea
                            placeholder={t('orders.specialDeliveryInstructions')}
                            rows={4}
                            value={formData.deliveryInstructions}
                            onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                            className="resize-none"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-between gap-4 pt-6 border-t mt-8">
                    <div>
                      {!isFirstTab && (
                        <Button variant="outline" onClick={handlePreviousTab} disabled={isSubmitting} className="h-12 px-6">
                          {t('orders.previous')}
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <Button variant="outline" onClick={() => {
                        setIsCreateDialogOpen(false);
                        resetForm();
                      }} disabled={isSubmitting} className="h-12 px-6">
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handleTabAction} disabled={isSubmitting} className="h-12 px-8">
                        {isSubmitting ? (
                          <>
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                            {isLastTab
                              ? (isEditMode ? t('orders.updating') : t('orders.creating'))
                              : t('orders.processingLabel')
                            }
                          </>
                        ) : (
                          isLastTab
                            ? (isEditMode ? t('orders.updateOrder') : t('orders.createOrder'))
                            : t('orders.next')
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('orders.totalOrders')}</p>
          <p className="text-gray-900">
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              orders.length
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('orders.pending')}</p>
          <p className="text-gray-900">
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              orders.filter(o => o.orderStatus === 'pending').length
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('orders.processing')}</p>
          <p className="text-gray-900">
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              orders.filter(o => o.orderStatus === 'processing').length
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('orders.shipped')}</p>
          <p className="text-gray-900">
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              orders.filter(o => o.orderStatus === 'shipped').length
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('orders.delivered')}</p>
          <p className="text-gray-900">
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              orders.filter(o => o.orderStatus === 'delivered').length
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('orders.totalValue')}</p>
          <p className="text-gray-900">
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              `€${orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}`
            )}
          </p>
        </Card>
      </div>

      {/* Order Tracking Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('orders.orderTracking')}</h3>
          <Button
            variant="outline"
            onClick={() => setIsTrackingExpanded(!isTrackingExpanded)}
            className="flex items-center gap-2"
          >
            {isTrackingExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {t('orders.hideFilters')}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {t('orders.showFilters')}
              </>
            )}
          </Button>
        </div>

        {isTrackingExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label className="text-sm font-medium">{t('orders.filterByClient')}</Label>
              <Select value={trackingClientFilter} onValueChange={setTrackingClientFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('orders.allClients')}</SelectItem>
                  {Array.from(new Set(orders.map(order => order.client))).map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">{t('orders.filterByMonth')}</Label>
              <Select value={trackingMonthFilter} onValueChange={setTrackingMonthFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('orders.allMonths')}</SelectItem>
                  <SelectItem value="1">{t('orders.january')}</SelectItem>
                  <SelectItem value="2">{t('orders.february')}</SelectItem>
                  <SelectItem value="3">{t('orders.march')}</SelectItem>
                  <SelectItem value="4">{t('orders.april')}</SelectItem>
                  <SelectItem value="5">{t('orders.may')}</SelectItem>
                  <SelectItem value="6">{t('orders.june')}</SelectItem>
                  <SelectItem value="7">{t('orders.july')}</SelectItem>
                  <SelectItem value="8">{t('orders.august')}</SelectItem>
                  <SelectItem value="9">{t('orders.september')}</SelectItem>
                  <SelectItem value="10">{t('orders.october')}</SelectItem>
                  <SelectItem value="11">{t('orders.november')}</SelectItem>
                  <SelectItem value="12">{t('orders.december')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">{t('orders.filterByYear')}</Label>
              <Select value={trackingYearFilter} onValueChange={setTrackingYearFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('orders.allYears')}</SelectItem>
                  {Array.from(new Set(orders.map(order => new Date(order.orderDate).getFullYear().toString()))).sort().reverse().map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Tracking Results */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-600 mb-1">{t('orders.filteredOrders')}</p>
            <p className="text-2xl font-bold text-blue-900">
              {orders.filter(order => {
                const matchesClient = trackingClientFilter === 'all' || order.client === trackingClientFilter;
                const orderDate = new Date(order.orderDate);
                const matchesMonth = trackingMonthFilter === 'all' || (orderDate.getMonth() + 1).toString() === trackingMonthFilter;
                const matchesYear = trackingYearFilter === 'all' || orderDate.getFullYear().toString() === trackingYearFilter;
                return matchesClient && matchesMonth && matchesYear;
              }).length}
            </p>
          </Card>

          <Card className="p-4 bg-green-50 border-green-200">
            <p className="text-sm text-green-600 mb-1">{t('orders.totalValue')}</p>
            <p className="text-2xl font-bold text-green-900">
              €{orders.filter(order => {
                const matchesClient = trackingClientFilter === 'all' || order.client === trackingClientFilter;
                const orderDate = new Date(order.orderDate);
                const matchesMonth = trackingMonthFilter === 'all' || (orderDate.getMonth() + 1).toString() === trackingMonthFilter;
                const matchesYear = trackingYearFilter === 'all' || orderDate.getFullYear().toString() === trackingYearFilter;
                return matchesClient && matchesMonth && matchesYear;
              }).reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString()}
            </p>
          </Card>

          <Card className="p-4 bg-purple-50 border-purple-200">
            <p className="text-sm text-purple-600 mb-1">{t('orders.completedOrders')}</p>
            <p className="text-2xl font-bold text-purple-900">
              {orders.filter(order => {
                const matchesClient = trackingClientFilter === 'all' || order.client === trackingClientFilter;
                const orderDate = new Date(order.orderDate);
                const matchesMonth = trackingMonthFilter === 'all' || (orderDate.getMonth() + 1).toString() === trackingMonthFilter;
                const matchesYear = trackingYearFilter === 'all' || orderDate.getFullYear().toString() === trackingYearFilter;
                const isCompleted = order.orderStatus === 'delivered';
                return matchesClient && matchesMonth && matchesYear && isCompleted;
              }).length}
            </p>
          </Card>

          <Card className="p-4 bg-orange-50 border-orange-200">
            <p className="text-sm text-orange-600 mb-1">{t('orders.averageOrderValue')}</p>
            <p className="text-2xl font-bold text-orange-900">
              €{(() => {
                const filteredOrders = orders.filter(order => {
                  const matchesClient = trackingClientFilter === 'all' || order.client === trackingClientFilter;
                  const orderDate = new Date(order.orderDate);
                  const matchesMonth = trackingMonthFilter === 'all' || (orderDate.getMonth() + 1).toString() === trackingMonthFilter;
                  const matchesYear = trackingYearFilter === 'all' || orderDate.getFullYear().toString() === trackingYearFilter;
                  return matchesClient && matchesMonth && matchesYear;
                });
                const average = filteredOrders.length > 0
                  ? filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0) / filteredOrders.length
                  : 0;
                return average.toLocaleString();
              })()}
            </p>
          </Card>
        </div>
      </Card>

      {/* Orders Table */}
      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('orders.orderNumber')}</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none transition-colors"
                  onClick={() => handleSort('orderTitle')}
                >
                  <div className="flex items-center justify-between">
                    <span>{t('orders.orderTitle')}</span>
                    {getSortIcon('orderTitle')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none transition-colors"
                  onClick={() => handleSort('client')}
                >
                  <div className="flex items-center justify-between">
                    <span>{t('orders.client')}</span>
                    {getSortIcon('client')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none transition-colors"
                  onClick={() => handleSort('orderDate')}
                >
                  <div className="flex items-center justify-between">
                    <span>{t('orders.orderDate')}</span>
                    {getSortIcon('orderDate')}
                  </div>
                </TableHead>
                <TableHead>{t('orders.deliveryDate')}</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none transition-colors"
                  onClick={() => handleSort('totalAmount')}
                >
                  <div className="flex items-center justify-between">
                    <span>{t('orders.totalAmount')}</span>
                    {getSortIcon('totalAmount')}
                  </div>
                </TableHead>
                <TableHead>{t('orders.orderStatus')}</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none transition-colors"
                  onClick={() => handleSort('paymentStatus')}
                >
                  <div className="flex items-center justify-between">
                    <span>{t('orders.payment')}</span>
                    {getSortIcon('paymentStatus')}
                  </div>
                </TableHead>
                <TableHead>{t('orders.assignedTo')}</TableHead>
                <TableHead>{t('orders.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="w-5 h-5 animate-spin text-gray-400" />
                      <span className="text-gray-500">{t('orders.loadingOrders')}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="text-gray-500">
                      {searchQuery || statusFilter !== 'all' ? t('orders.noOrdersMatchingCriteria') : t('orders.noOrdersFound')}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-gray-900">
                      <div className="font-medium">{order.orderNumber}</div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {order.orderTitle || '-'}
                    </TableCell>
                    <TableCell className="text-gray-900">{order.client}</TableCell>
                    <TableCell className="text-gray-600">{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-gray-600">{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-gray-900">€{order.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select
                          value={order.orderStatus}
                          onValueChange={(newStatus) => handleQuickStatusUpdate(order.id, newStatus)}
                          disabled={statusUpdatingId === order.id}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue>
                              {statusUpdatingId === order.id ? (
                                <div className="flex items-center gap-1">
                                  <Loader className="w-3 h-3 animate-spin" />
                                  <span className="text-xs">{t('orders.updating')}</span>
                                </div>
                              ) : (
                                getStatusBadge(order.orderStatus)
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              {getDropdownStatusBadge('pending')}
                            </SelectItem>
                            <SelectItem value="processing">
                              {getDropdownStatusBadge('processing')}
                            </SelectItem>
                            <SelectItem value="ready">
                              {getDropdownStatusBadge('ready')}
                            </SelectItem>
                            <SelectItem value="shipped">
                              {getDropdownStatusBadge('shipped')}
                            </SelectItem>
                            <SelectItem value="delivered">
                              {getDropdownStatusBadge('delivered')}
                            </SelectItem>
                            <SelectItem value="cancelled">
                              {getDropdownStatusBadge('cancelled')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getStatusBadge(order.orderStatus)
                      )}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(order.paymentStatus)}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {order.assignedTo || t('orders.unassigned')}
                    </TableCell>
                    <TableCell className="relative">
                      <div className="flex items-center gap-2">
                        {!order.assignedTo && (userRole === 'admin' || userRole === 'order_manager') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsAssignDialogOpen(true);
                            }}
                            className="text-xs"
                          >
                            <User className="w-3 h-3 mr-1" />
                            {t('orders.assign')}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDropdownToggle(order.id, e)}
                          className="h-8 w-8 hover:bg-gray-100 transition-colors duration-150"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Custom Dropdown Menu */}
      {openDropdownId && dropdownPosition && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeDropdown}
          />
          <div
            className={`fixed z-[9999] min-w-[160px] bg-white border border-gray-200 rounded-md shadow-lg py-1 transition-all duration-150 ease-out ${dropdownPosition.openUpward
              ? 'animate-in slide-in-from-bottom-1 fade-in-0'
              : 'animate-in slide-in-from-top-1 fade-in-0'
              }`}
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
              onClick={(e) => {
                e.stopPropagation();
                const order = orders.find(o => o.id === openDropdownId);
                if (order) handleViewDetails(order);
                closeDropdown();
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              {t('orders.viewDetails')}
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
              onClick={(e) => {
                e.stopPropagation();
                const order = orders.find(o => o.id === openDropdownId);
                if (order) {
                  handleDownloadInvoice(order.id);
                }
                closeDropdown();
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              {t('orders.downloadInvoice')}
            </button>
            {(userRole === 'admin' || userRole === 'order_manager') && (
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  const order = orders.find(o => o.id === openDropdownId);
                  if (order) {
                    setSelectedOrder(order);
                    setIsAssignDialogOpen(true);
                  }
                  closeDropdown();
                }}
              >
                <User className="w-4 h-4 mr-2" />
                {t('orders.assignOrder')}
              </button>
            )}
            {canEdit && (
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  const order = orders.find(o => o.id === openDropdownId);
                  if (order) handleEditOrder(order);
                  closeDropdown();
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('orders.edit')}
              </button>
            )}
            {canDelete && (
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600 transition-colors duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  const order = orders.find(o => o.id === openDropdownId);
                  if (order) handleDeleteOrder(order);
                  closeDropdown();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('orders.deleteOrder')}
              </button>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('orders.deleteOrder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('orders.deleteOrderConfirm', { orderNumber: selectedOrder?.orderNumber })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
                {t('orders.keepOrder')}
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                {t('orders.deleteOrder')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('orders.assignOrder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 mb-4">
                {t('orders.assignOrderTo', { orderNumber: selectedOrder?.orderNumber })}
              </p>
              <div className="space-y-2">
                <Label>{t('orders.selectOfficeEmployee')}</Label>
                <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('orders.chooseOfficeEmployee')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassign">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-gray-500" />
                        <span>{t('orders.unassignOrder')}</span>
                      </div>
                    </SelectItem>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          <span>{user.fullName}</span>
                          <Badge variant="outline" className="text-xs">
                            {t('orders.officeEmployee')}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableUsers.length === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    {t('orders.noOfficeEmployeesFound')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedAssigneeId('');
              }}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAssignOrder} disabled={!selectedAssigneeId}>
                {selectedAssigneeId === 'unassign' ? t('orders.unassignOrder') : t('orders.assignOrder')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Assignment Dialog */}
      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('orders.bulkAssignOrders')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 mb-4">
                {t('orders.assignUnassignedOrders')}
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  {t('orders.unassignedOrdersWillBeAssigned', { count: orders.filter(order => !order.assignedTo).length })}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t('orders.selectOfficeEmployee')}</Label>
                <Select value={bulkAssigneeId} onValueChange={setBulkAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('orders.chooseOfficeEmployee')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          <span>{user.fullName}</span>
                          <Badge variant="outline" className="text-xs">
                            {t('orders.officeEmployee')}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableUsers.length === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    {t('orders.noOfficeEmployeesFound')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsBulkAssignOpen(false);
                setBulkAssigneeId('');
              }}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleBulkAssign} disabled={!bulkAssigneeId || orders.filter(order => !order.assignedTo).length === 0}>
                {t('orders.assignOrdersCount', { count: orders.filter(order => !order.assignedTo).length })}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('orders.orderDetailsModal')}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">{t('orders.orderNumber')}</Label>
                  <p className="text-gray-900 font-semibold">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{t('orders.client')}</Label>
                  <p className="text-gray-900 font-semibold">{selectedOrder.client}</p>
                </div>
                {selectedOrder.orderTitle && (
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">{t('orders.orderTitle')}</Label>
                    <p className="text-gray-900 font-semibold">{selectedOrder.orderTitle}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-gray-500">{t('orders.orderDate')}</Label>
                  <p className="text-gray-900">{new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{t('orders.deliveryDate')}</Label>
                  <p className="text-gray-900">{selectedOrder.expectedDeliveryDate ? new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{t('orders.orderStatus')}</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.orderStatus)}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{t('orders.paymentStatus')}</Label>
                  <div className="mt-1">{getPaymentStatusBadge(selectedOrder.paymentStatus)}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold">{t('orders.pricing')}</Label>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('orders.subtotal')}:</span>
                    <span className="text-gray-900">€{selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-900 font-semibold">{t('orders.total')}:</span>
                    <span className="text-gray-900 font-semibold">€{selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.deliveryAddress && (
                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">{t('orders.deliveryInformation')}</Label>
                  <div className="mt-3 space-y-2 text-sm">
                    <p><span className="text-gray-600">{t('orders.address')}:</span> {selectedOrder.deliveryAddress}</p>
                    <p><span className="text-gray-600">{t('orders.method')}:</span> {selectedOrder.deliveryMethod || '-'}</p>
                    <p><span className="text-gray-600">{t('orders.cost')}:</span> €{selectedOrder.deliveryCost.toFixed(2)}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
                  {t('orders.close')}
                </Button>
                <Button variant="outline" onClick={() => handleDownloadInvoice(selectedOrder.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  {t('orders.downloadInvoice')}
                </Button>
                {canEdit && (
                  <Button onClick={() => {
                    handleEditOrder(selectedOrder);
                    setIsDetailsModalOpen(false);
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t('orders.edit')}
                  </Button>
                )}
                {canDelete && (
                  <Button variant="destructive" onClick={() => handleDeleteOrder(selectedOrder)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('orders.deleteOrder')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Export Dialog */}
      <OrderExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        orders={orders}
      />
    </div>
  );
}
