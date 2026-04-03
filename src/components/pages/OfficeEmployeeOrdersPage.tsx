'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Search,
  Eye,
  Edit,
  Download,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Loader,
  AlertTriangle,
  MessageSquare,
  FileText,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface OfficeEmployeeOrdersPageProps {
  userRole: string;
  userId: string;
}

interface Order {
  id: string;
  orderNumber: string;
  orderTitle?: string;
  client: string;
  clientId?: string;
  clientPhone?: string;
  clientEmail?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  assignedToId?: string;
  assignedTo?: string | {
    id: string;
    fullName: string;
    role: string;
  };
  items: any[];
  notes?: string;
  paymentMethod?: string;
  deliveryMethod?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  deliveryCost: number;
  subtotal: number;
  createdAt: string;
  updatedAt?: string;
  creator?: {
    id: string;
    fullName: string;
    role: string;
  };
  clientDetails?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    address?: string;
    dateOfBirth?: string;
    idNumber?: string;
    status: string;
  };
}

export function OfficeEmployeeOrdersPage({ userRole, userId }: OfficeEmployeeOrdersPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('assigned');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [processingNotes, setProcessingNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, userId]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      // Only fetch orders assigned to this office employee
      const url = `/api/orders?assignedTo=${userId}`;

      const response = await fetch(url);
      const data = await response.json();

      // Filter orders based on status filter
      let filteredOrders = data.orders || [];

      if (statusFilter === 'assigned') {
        // Show all assigned orders (pending, processing, ready)
        filteredOrders = filteredOrders.filter((order: Order) =>
          ['pending', 'processing', 'ready'].includes(order.orderStatus)
        );
      } else if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter((order: Order) =>
          order.orderStatus === statusFilter
        );
      }

      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (order: Order) => {
    setIsDetailsModalOpen(true);
    setIsLoadingDetails(true);

    try {
      // Fetch detailed order information including product/service details
      const response = await fetch(`/api/orders/${order.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedOrder(data.order);
      } else {
        // Fallback to the basic order data if API call fails
        setSelectedOrder(order);
        toast.error('Could not load detailed item information');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      // Fallback to the basic order data
      setSelectedOrder(order);
      toast.error('Could not load detailed item information');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleStartProcessing = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus('processing');
    setProcessingNotes('');
    setIsProcessingModalOpen(true);
  };

  const handleUpdatePaymentStatus = (order: Order) => {
    setSelectedOrder(order);
    setNewPaymentStatus(order.paymentStatus);
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    if (!processingNotes.trim()) {
      toast.error('Processing notes are required to document your review');
      return;
    }

    try {
      setIsUpdating(true);

      // Append processing notes to existing notes
      const updatedNotes = selectedOrder.notes
        ? `${selectedOrder.notes}\n\n[${new Date().toLocaleString()}] Status updated to ${newStatus}: ${processingNotes}`
        : `[${new Date().toLocaleString()}] Status updated to ${newStatus}: ${processingNotes}`;

      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderStatus: newStatus,
          notes: updatedNotes,
        }),
      });

      if (response.ok) {
        await fetchOrders();
        setIsProcessingModalOpen(false);
        setSelectedOrder(null);
        toast.success(`Order status updated to ${newStatus}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!selectedOrder || !newPaymentStatus) return;

    try {
      setIsUpdating(true);

      // Only append payment notes if provided
      let updatedNotes = selectedOrder.notes;
      if (paymentNotes.trim()) {
        updatedNotes = selectedOrder.notes
          ? `${selectedOrder.notes}\n\n[${new Date().toLocaleString()}] Payment status updated to ${newPaymentStatus}: ${paymentNotes}`
          : `[${new Date().toLocaleString()}] Payment status updated to ${newPaymentStatus}: ${paymentNotes}`;
      } else {
        updatedNotes = selectedOrder.notes
          ? `${selectedOrder.notes}\n\n[${new Date().toLocaleString()}] Payment status updated to ${newPaymentStatus}`
          : `[${new Date().toLocaleString()}] Payment status updated to ${newPaymentStatus}`;
      }

      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: newPaymentStatus,
          notes: updatedNotes,
        }),
      });

      if (response.ok) {
        await fetchOrders();
        setIsPaymentModalOpen(false);
        setSelectedOrder(null);
        toast.success(`Payment status updated to ${newPaymentStatus}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickStatusUpdate = async (order: Order, newStatus: string) => {
    try {
      setIsUpdating(true);

      // Append quick update note to existing notes
      const updatedNotes = order.notes
        ? `${order.notes}\n\n[${new Date().toLocaleString()}] Status updated to ${newStatus} by office employee`
        : `[${new Date().toLocaleString()}] Status updated to ${newStatus} by office employee`;

      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderStatus: newStatus,
          notes: updatedNotes,
        }),
      });

      if (response.ok) {
        await fetchOrders();
        toast.success(`Order status updated to ${newStatus}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickPaymentUpdate = async (order: Order, newPaymentStatus: string) => {
    try {
      setIsUpdating(true);

      // Append quick payment update note to existing notes
      const updatedNotes = order.notes
        ? `${order.notes}\n\n[${new Date().toLocaleString()}] Payment status updated to ${newPaymentStatus} by office employee`
        : `[${new Date().toLocaleString()}] Payment status updated to ${newPaymentStatus} by office employee`;

      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: newPaymentStatus,
          notes: updatedNotes,
        }),
      });

      if (response.ok) {
        await fetchOrders();
        toast.success(`Payment status updated to ${newPaymentStatus}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/download`);

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const contentDisposition = response.headers.get('content-disposition');
      let filename = `order-${orderId}-invoice.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string; className?: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending Review', className: 'bg-yellow-100 text-yellow-800' },
      processing: { variant: 'default', icon: Package, label: 'Processing', className: 'bg-blue-100 text-blue-800' },
      ready: { variant: 'default', icon: CheckCircle, label: 'Ready for Delivery', className: 'bg-cyan-100 text-cyan-800' },
      shipped: { variant: 'default', icon: Truck, label: 'Shipped', className: 'bg-purple-100 text-purple-800' },
      delivered: { variant: 'default', icon: CheckCircle, label: 'Delivered', className: 'bg-green-100 text-green-800' },
      cancelled: { variant: 'secondary', icon: XCircle, label: 'Cancelled', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} hover:${config.className} flex items-center gap-1 min-w-fit text-xs px-2 py-1`}>
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="whitespace-nowrap">{config.label}</span>
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
      case 'refunded':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.orderTitle && order.orderTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Processing</h1>
          <p className="text-gray-600">Review and process orders assigned to you</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assigned">My Assigned Orders</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="ready">Ready for Delivery</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-xl font-semibold text-gray-900">
                {orders.filter(o => o.orderStatus === 'pending').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Processing</p>
              <p className="text-xl font-semibold text-gray-900">
                {orders.filter(o => o.orderStatus === 'processing').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-100 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ready for Delivery</p>
              <p className="text-xl font-semibold text-gray-900">
                {orders.filter(o => o.orderStatus === 'ready').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-xl font-semibold text-gray-900">
                €{orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Details</TableHead>
                <TableHead>Client Information</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="w-5 h-5 animate-spin text-gray-400" />
                      <span className="text-gray-500">Loading orders...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-gray-500">
                      {searchQuery || statusFilter !== 'all' ? 'No orders found matching your criteria' : 'No orders assigned to you'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{order.orderNumber}</div>
                        {order.orderTitle && (
                          <div className="text-sm text-gray-600">{order.orderTitle}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{order.client}</div>
                        {order.clientPhone && (
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {order.clientPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      €{order.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.orderStatus}
                        onValueChange={(newStatus) => handleQuickStatusUpdate(order, newStatus)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
                          <div className="flex items-center gap-1 cursor-pointer">
                            {getStatusBadge(order.orderStatus)}
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="processing">
                            <div className="flex items-center gap-2 text-blue-600">
                              <Package className="w-4 h-4" />
                              <span>Processing</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="ready">
                            <div className="flex items-center gap-2 text-cyan-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>Ready</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="shipped">
                            <div className="flex items-center gap-2 text-purple-600">
                              <Truck className="w-4 h-4" />
                              <span>Shipped</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="delivered">
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>Delivered</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.paymentStatus}
                        onValueChange={(newPaymentStatus) => handleQuickPaymentUpdate(order, newPaymentStatus)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
                          <div className="flex items-center gap-1 cursor-pointer">
                            {getPaymentStatusBadge(order.paymentStatus)}
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          </SelectItem>
                          <SelectItem value="paid">
                            <Badge className="bg-green-100 text-green-800">Paid</Badge>
                          </SelectItem>
                          <SelectItem value="partial">
                            <Badge className="bg-orange-100 text-orange-800">Partial</Badge>
                          </SelectItem>
                          <SelectItem value="overdue">
                            <Badge className="bg-red-100 text-red-800">Overdue</Badge>
                          </SelectItem>
                          <SelectItem value="refunded">
                            <Badge className="bg-gray-100 text-gray-800">Refunded</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {order.orderStatus === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartProcessing(order)}
                          >
                            <Package className="w-4 h-4 mr-1" />
                            Process
                          </Button>
                        )}
                        {['processing', 'ready'].includes(order.orderStatus) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdatePaymentStatus(order)}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Payment
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(order.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && !isLoadingDetails ? (
            <div className="space-y-6 mt-4">
              {/* Stock Alert */}
              {selectedOrder.items && selectedOrder.items.some((item: any) =>
                item.type === 'product' &&
                item.details?.stock !== undefined &&
                item.details.stock < (item.quantity || 1)
              ) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-yellow-900">Stock Alert</h4>
                        <p className="text-sm text-yellow-800 mt-1">
                          Some products in this order have insufficient stock. Please review the Items tab and coordinate with inventory management.
                        </p>
                        <div className="mt-2">
                          {selectedOrder.items
                            .filter((item: any) =>
                              item.type === 'product' &&
                              item.details?.stock !== undefined &&
                              item.details.stock < (item.quantity || 1)
                            )
                            .map((item: any, index: number) => (
                              <div key={index} className="text-xs text-yellow-700 mt-1">
                                • {item.details?.title || item.name}: Need {item.quantity || 1}, Available {item.details?.stock || 0}
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="details">Order Details</TabsTrigger>
                  <TabsTrigger value="items">Items</TabsTrigger>
                  <TabsTrigger value="client">Client Info</TabsTrigger>
                  <TabsTrigger value="delivery">Delivery</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Order Number</Label>
                      <p className="text-gray-900 font-semibold">{selectedOrder.orderNumber}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Order Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedOrder.orderStatus)}</div>
                    </div>
                    {selectedOrder.orderTitle && (
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500">Order Title</Label>
                        <p className="text-gray-900 font-semibold">{selectedOrder.orderTitle}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-500">Order Date</Label>
                      <p className="text-gray-900">{new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Expected Delivery</Label>
                      <p className="text-gray-900">{selectedOrder.expectedDeliveryDate ? new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString() : '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Payment Status</Label>
                      <div className="mt-1">{getPaymentStatusBadge(selectedOrder.paymentStatus)}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Payment Method</Label>
                      <p className="text-gray-900">{selectedOrder.paymentMethod || '-'}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-base font-semibold">Pricing Summary</Label>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="text-gray-900">€{selectedOrder.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery Cost:</span>
                        <span className="text-gray-900">€{selectedOrder.deliveryCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-gray-900">€{selectedOrder.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.notes && (
                    <div className="border-t pt-4">
                      <Label className="text-base font-semibold">Order Notes</Label>
                      <p className="mt-2 text-gray-700">{selectedOrder.notes}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="items" className="space-y-4">
                  <div className="space-y-3">
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-4">
                            {/* Item Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {item.type?.toUpperCase() || 'ITEM'}
                                  </Badge>
                                  {item.details?.subcategory && (
                                    <Badge variant="secondary" className="text-xs">
                                      {item.details.subcategory.category?.name} / {item.details.subcategory.name}
                                    </Badge>
                                  )}
                                  {/* Stock Status for Products */}
                                  {item.type === 'product' && item.details?.stock !== undefined && (
                                    <Badge
                                      className={
                                        item.details.stock >= (item.quantity || 1)
                                          ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                          : item.details.stock > 0
                                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                                            : 'bg-red-100 text-red-800 hover:bg-red-100'
                                      }
                                    >
                                      {item.details.stock >= (item.quantity || 1)
                                        ? 'In Stock'
                                        : item.details.stock > 0
                                          ? 'Low Stock'
                                          : 'Out of Stock'
                                      }
                                    </Badge>
                                  )}
                                  {/* Product Status */}
                                  {item.type === 'product' && item.details?.status && item.details.status !== 'active' && (
                                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                                      {item.details.status}
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-semibold text-lg text-gray-900">
                                  {item.details?.title || item.details?.name || item.name || 'Unknown Item'}
                                </h4>
                                {item.details?.sku && (
                                  <p className="text-sm text-gray-500">SKU: {item.details.sku}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-500">Total</p>
                                <p className="text-xl font-bold text-gray-900">€{item.total?.toFixed(2) || '0.00'}</p>
                              </div>
                            </div>

                            {/* Item Description */}
                            {item.details?.description && (
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Description</Label>
                                <p className="text-sm text-gray-600 mt-1">{item.details.description}</p>
                              </div>
                            )}

                            {/* Item Images */}
                            {item.details?.images && item.details.images.length > 0 && (
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Images</Label>
                                <div className="flex gap-2 mt-2">
                                  {item.details.images.slice(0, 3).map((image: string, imgIndex: number) => (
                                    <img
                                      key={imgIndex}
                                      src={image}
                                      alt={`${item.details?.title || item.name} - Image ${imgIndex + 1}`}
                                      className="w-16 h-16 object-cover rounded-lg border"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ))}
                                  {item.details.images.length > 3 && (
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center">
                                      <span className="text-xs text-gray-500">+{item.details.images.length - 3}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Pricing and Quantity Details */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-3 border-t">
                              <div>
                                <Label className="text-xs text-gray-500">Quantity</Label>
                                <p className="font-medium text-gray-900">{item.quantity || 1}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Unit Price</Label>
                                <p className="font-medium text-gray-900">€{item.unitPrice?.toFixed(2) || item.details?.price?.toFixed(2) || '0.00'}</p>
                              </div>
                              {item.details?.unit && (
                                <div>
                                  <Label className="text-xs text-gray-500">Unit</Label>
                                  <p className="font-medium text-gray-900">{item.details.unit}</p>
                                </div>
                              )}
                              {item.type === 'product' && item.details?.stock !== undefined && (
                                <div>
                                  <Label className="text-xs text-gray-500">Available Stock</Label>
                                  <p className={`font-medium ${item.details.stock >= (item.quantity || 1)
                                    ? 'text-green-600'
                                    : item.details.stock > 0
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                    }`}>
                                    {item.details.stock} {item.details.unit || 'units'}
                                  </p>
                                </div>
                              )}
                              <div>
                                <Label className="text-xs text-gray-500">Line Total</Label>
                                <p className="font-semibold text-gray-900">€{item.total?.toFixed(2) || '0.00'}</p>
                              </div>
                            </div>

                            {/* Service Package Details */}
                            {item.type === 'package' && item.details && (
                              <div className="pt-3 border-t">
                                <Label className="text-sm font-medium text-gray-700">Package Contents</Label>
                                <div className="mt-2 space-y-2">
                                  {item.details.services && Array.isArray(item.details.services) && item.details.services.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-600 mb-1">Services:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {item.details.services.map((service: any, sIndex: number) => (
                                          <Badge key={sIndex} variant="outline" className="text-xs">
                                            {service.name || service.title || `Service ${sIndex + 1}`}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {item.details.products && Array.isArray(item.details.products) && item.details.products.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-600 mb-1">Products:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {item.details.products.map((product: any, pIndex: number) => (
                                          <Badge key={pIndex} variant="outline" className="text-xs">
                                            {product.name || product.title || `Product ${pIndex + 1}`}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No items found in this order</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="client" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Client Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact Information</h3>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Client Name</Label>
                        <p className="text-gray-900 font-semibold text-lg">
                          {selectedOrder.clientDetails?.fullName || selectedOrder.client}
                        </p>
                      </div>

                      {(selectedOrder.clientDetails?.phone || selectedOrder.clientPhone) && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
                          <p className="text-gray-900 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <a
                              href={`tel:${selectedOrder.clientDetails?.phone || selectedOrder.clientPhone}`}
                              className="hover:text-blue-600 transition-colors"
                            >
                              {selectedOrder.clientDetails?.phone || selectedOrder.clientPhone}
                            </a>
                          </p>
                        </div>
                      )}

                      {(selectedOrder.clientDetails?.email || selectedOrder.clientEmail) && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Email Address</Label>
                          <p className="text-gray-900 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <a
                              href={`mailto:${selectedOrder.clientDetails?.email || selectedOrder.clientEmail}`}
                              className="hover:text-blue-600 transition-colors"
                            >
                              {selectedOrder.clientDetails?.email || selectedOrder.clientEmail}
                            </a>
                          </p>
                        </div>
                      )}

                      {selectedOrder.clientDetails?.address && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Address</Label>
                          <p className="text-gray-900 flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                            <span>{selectedOrder.clientDetails.address}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Additional Client Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Information</h3>

                      {selectedOrder.clientDetails?.idNumber && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">ID Number</Label>
                          <p className="text-gray-900">{selectedOrder.clientDetails.idNumber}</p>
                        </div>
                      )}

                      {selectedOrder.clientDetails?.dateOfBirth && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Date of Birth</Label>
                          <p className="text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            {new Date(selectedOrder.clientDetails.dateOfBirth).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      {selectedOrder.clientDetails?.status && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Client Status</Label>
                          <Badge
                            className={selectedOrder.clientDetails.status === 'active'
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : 'bg-red-100 text-red-800 hover:bg-red-100'
                            }
                          >
                            {selectedOrder.clientDetails.status}
                          </Badge>
                        </div>
                      )}

                      {selectedOrder.clientId && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Client ID</Label>
                          <p className="text-gray-600 text-sm font-mono">{selectedOrder.clientId}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order-specific Client Information */}
                  {(selectedOrder.deliveryAddress || selectedOrder.deliveryInstructions) && (
                    <div className="border-t pt-6 mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Order-Specific Information</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {selectedOrder.deliveryAddress && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Delivery Address for this Order</Label>
                            <p className="text-gray-900 flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                              <span>{selectedOrder.deliveryAddress}</span>
                            </p>
                          </div>
                        )}
                        {selectedOrder.deliveryInstructions && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Special Delivery Instructions</Label>
                            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedOrder.deliveryInstructions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {selectedOrder.deliveryAddress && (
                      <div>
                        <Label className="text-xs text-gray-500">Delivery Address</Label>
                        <p className="text-gray-900 flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                          {selectedOrder.deliveryAddress}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Delivery Method</Label>
                        <p className="text-gray-900">{selectedOrder.deliveryMethod || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Delivery Cost</Label>
                        <p className="text-gray-900">€{selectedOrder.deliveryCost.toFixed(2)}</p>
                      </div>
                    </div>
                    {selectedOrder.deliveryInstructions && (
                      <div>
                        <Label className="text-xs text-gray-500">Delivery Instructions</Label>
                        <p className="text-gray-900">{selectedOrder.deliveryInstructions}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Order Activity History</Label>
                      <Badge variant="outline" className="text-xs">
                        Created: {new Date(selectedOrder.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>

                    {/* Order Timeline */}
                    <div className="space-y-3">
                      {/* Creation Event */}
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">Order Created</p>
                            <span className="text-xs text-gray-500">
                              {new Date(selectedOrder.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Order {selectedOrder.orderNumber} was created
                            {selectedOrder.creator && ` by ${selectedOrder.creator.fullName} (${selectedOrder.creator.role})`}
                          </p>
                        </div>
                      </div>

                      {/* Assignment Event */}
                      {selectedOrder.assignedTo && (
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900">Order Assigned</p>
                              <span className="text-xs text-gray-500">
                                {selectedOrder.updatedAt ? new Date(selectedOrder.updatedAt).toLocaleString() : 'N/A'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Assigned to {typeof selectedOrder.assignedTo === 'string'
                                ? selectedOrder.assignedTo
                                : selectedOrder.assignedTo?.fullName} ({typeof selectedOrder.assignedTo === 'string'
                                  ? 'Unknown Role'
                                  : selectedOrder.assignedTo?.role})
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Current Status */}
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">Current Status</p>
                            <span className="text-xs text-gray-500">
                              {selectedOrder.updatedAt ? new Date(selectedOrder.updatedAt).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Order Status:</span>
                            {getStatusBadge(selectedOrder.orderStatus)}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">Payment Status:</span>
                            {getPaymentStatusBadge(selectedOrder.paymentStatus)}
                          </div>
                        </div>
                      </div>

                      {/* Order Notes History */}
                      {selectedOrder.notes && (
                        <div className="border-t pt-4">
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Order Notes & Updates</Label>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                              {selectedOrder.notes}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Order Summary */}
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">Order Summary</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Items Count:</span>
                            <p className="font-medium">{selectedOrder.items?.length || 0}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Order Value:</span>
                            <p className="font-medium">€{selectedOrder.totalAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Payment Method:</span>
                            <p className="font-medium">{selectedOrder.paymentMethod || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Delivery Method:</span>
                            <p className="font-medium">{selectedOrder.deliveryMethod || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => handleDownloadInvoice(selectedOrder.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Invoice
                </Button>
                {selectedOrder.orderStatus === 'processing' && (
                  <Button
                    onClick={() => handleQuickStatusUpdate(selectedOrder, 'ready')}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Ready
                  </Button>
                )}
                {selectedOrder.orderStatus === 'pending' && (
                  <Button onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleStartProcessing(selectedOrder);
                  }}>
                    <Package className="w-4 h-4 mr-2" />
                    Start Processing
                  </Button>
                )}
              </div>
            </div>
          ) : isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Loading order details...</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Processing Modal */}
      <Dialog open={isProcessingModalOpen} onOpenChange={setIsProcessingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Order Processing Checklist</h4>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1">
                    <li>✓ Review invoice shared by Order Manager</li>
                    <li>✓ Verify product details and quantities are correct</li>
                    <li>✓ Confirm pricing matches the invoice</li>
                    <li>✓ Check client name, phone number, and location</li>
                    <li>✓ Validate delivery instructions are clear</li>
                    <li>✓ Ensure no data is missing before processing</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <Label>Update Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processing">Start Processing</SelectItem>
                  <SelectItem value="ready">Ready for Delivery</SelectItem>
                  <SelectItem value="shipped">Mark as Shipped</SelectItem>
                  <SelectItem value="delivered">Mark as Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Processing Notes (Required)</Label>
              <Textarea
                placeholder="Confirm invoice review completed and all details verified. Add any coordination notes with internal teams..."
                value={processingNotes}
                onChange={(e) => setProcessingNotes(e.target.value)}
                rows={4}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Document your review process and any internal coordination required
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsProcessingModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateOrderStatus} disabled={!newStatus || !processingNotes.trim() || isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Order Status'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Status Update Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Payment Status Update</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Update the payment status based on client payment confirmation or internal payment processing.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>Payment Status</Label>
              <Select value={newPaymentStatus} onValueChange={setNewPaymentStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partially Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment Notes (Optional)</Label>
              <Textarea
                placeholder="Document payment confirmation, method used, reference number, or any payment-related details..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Document payment details for audit trail and client communication
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePayment} disabled={!newPaymentStatus || isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Payment Status'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}