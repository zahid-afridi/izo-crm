'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Search,
    Eye,
    CheckCircle,
    XCircle,
    Edit,
    Clock,
    Package,
    Truck,
    AlertTriangle,
    DollarSign,
    FileText,
    User,
    Calendar,
    Filter,
    Download
} from 'lucide-react';
import { toast } from 'sonner';

interface Order {
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
    subtotal: number;
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
    createdAt: string;
    createdBy?: string;
    createdByRole?: string;
}

interface OrderStats {
    totalOrders: number;
    pendingApproval: number;
    approved: number;
    rejected: number;
    processing: number;
    totalValue: number;
    averageOrderValue: number;
}

export function OrderManagementPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [createdByFilter, setCreatedByFilter] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
    const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'modify'>('approve');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [modificationDetails, setModificationDetails] = useState('');
    const [stats, setStats] = useState<OrderStats>({
        totalOrders: 0,
        pendingApproval: 0,
        approved: 0,
        rejected: 0,
        processing: 0,
        totalValue: 0,
        averageOrderValue: 0,
    });

    // Fetch orders created by Sales Agents and Office Employees
    const fetchOrders = async () => {
        try {
            setLoading(true);
            // Fetch orders created by sales_agent and office_employee roles
            const response = await fetch('/api/orders?createdBy=sales_agent,office_employee');

            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }

            const data = await response.json();
            const ordersData = data.orders || [];
            
            // Ensure we only show orders created by sales agents and office employees
            const filteredOrders = ordersData.filter((order: Order) => 
                ['sales_agent', 'office_employee'].includes(order.createdByRole || '')
            );
            
            setOrders(filteredOrders);
            calculateStats(filteredOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    // Calculate order statistics
    const calculateStats = (orderList: Order[]) => {
        const totalOrders = orderList.length;
        const pendingApproval = orderList.filter(order => order.orderStatus === 'pending').length;
        const approved = orderList.filter(order => ['processing', 'ready', 'shipped', 'delivered'].includes(order.orderStatus)).length;
        const rejected = orderList.filter(order => order.orderStatus === 'cancelled').length;
        const processing = orderList.filter(order => order.orderStatus === 'processing').length;
        const totalValue = orderList.reduce((sum, order) => sum + order.totalAmount, 0);
        const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;

        setStats({
            totalOrders,
            pendingApproval,
            approved,
            rejected,
            processing,
            totalValue,
            averageOrderValue,
        });
    };

    // Filter orders based on search and filters
    useEffect(() => {
        let filtered = orders;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(order =>
                order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.orderTitle && order.orderTitle.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.orderStatus === statusFilter);
        }

        // Created by filter
        if (createdByFilter !== 'all') {
            filtered = filtered.filter(order => order.createdByRole === createdByFilter);
        }

        setFilteredOrders(filtered);
    }, [orders, searchTerm, statusFilter, createdByFilter]);

    // Approve order
    const approveOrder = async (orderId: string, notes?: string) => {
        try {
            const response = await fetch(`/api/orders/${orderId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve',
                    notes: notes || 'Order approved by Order Manager',
                    newStatus: 'processing'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to approve order');
            }

            toast.success('Order approved successfully');
            fetchOrders(); // Refresh data
        } catch (error) {
            console.error('Error approving order:', error);
            toast.error('Failed to approve order');
        }
    };

    // Reject order
    const rejectOrder = async (orderId: string, reason: string) => {
        try {
            const response = await fetch(`/api/orders/${orderId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reject',
                    notes: reason,
                    newStatus: 'cancelled'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to reject order');
            }

            toast.success('Order rejected successfully');
            fetchOrders(); // Refresh data
        } catch (error) {
            console.error('Error rejecting order:', error);
            toast.error('Failed to reject order');
        }
    };

    // Modify order
    const modifyOrder = async (orderId: string, modifications: string, notes: string) => {
        try {
            const response = await fetch(`/api/orders/${orderId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'modify',
                    modifications,
                    notes,
                    newStatus: 'pending_modification'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to modify order');
            }

            toast.success('Order modification request sent');
            fetchOrders(); // Refresh data
        } catch (error) {
            console.error('Error modifying order:', error);
            toast.error('Failed to modify order');
        }
    };

    // Update order status
    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderStatus: newStatus }),
            });

            if (!response.ok) {
                throw new Error('Failed to update order status');
            }

            toast.success(`Order status updated to ${newStatus}`);
            fetchOrders(); // Refresh data
        } catch (error) {
            console.error('Error updating order status:', error);
            toast.error('Failed to update order status');
        }
    };

    // Handle approval action
    const handleApprovalAction = async () => {
        if (!selectedOrder) return;

        switch (approvalAction) {
            case 'approve':
                await approveOrder(selectedOrder.id, approvalNotes);
                break;
            case 'reject':
                if (!approvalNotes.trim()) {
                    toast.error('Please provide a reason for rejection');
                    return;
                }
                await rejectOrder(selectedOrder.id, approvalNotes);
                break;
            case 'modify':
                if (!modificationDetails.trim() || !approvalNotes.trim()) {
                    toast.error('Please provide modification details and notes');
                    return;
                }
                await modifyOrder(selectedOrder.id, modificationDetails, approvalNotes);
                break;
        }

        setIsApprovalDialogOpen(false);
        setSelectedOrder(null);
        setApprovalNotes('');
        setModificationDetails('');
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'processing':
                return 'bg-blue-100 text-blue-800';
            case 'ready':
                return 'bg-cyan-100 text-cyan-800';
            case 'shipped':
                return 'bg-purple-100 text-purple-800';
            case 'delivered':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            case 'pending_modification':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return Clock;
            case 'processing':
                return Package;
            case 'ready':
                return CheckCircle;
            case 'shipped':
                return Truck;
            case 'delivered':
                return CheckCircle;
            case 'cancelled':
                return XCircle;
            case 'pending_modification':
                return Edit;
            default:
                return Clock;
        }
    };

    const formatCurrency = (amount: number, currency = 'EUR') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    // Verify invoice details
    const verifyInvoiceDetails = (order: Order) => {
        const issues = [];

        if (!order.items || order.items.length === 0) {
            issues.push('No items in order');
        }

        if (order.totalAmount <= 0) {
            issues.push('Invalid total amount');
        }

        if (!order.client) {
            issues.push('Missing client information');
        }

        // Check for pricing consistency
        const calculatedSubtotal = order.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
        if (Math.abs(calculatedSubtotal - order.subtotal) > 0.01) {
            issues.push('Subtotal calculation mismatch');
        }

        return issues;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
                    <p className="text-gray-600">Review and approve orders from Sales Agents and Office Employees</p>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                            </div>
                            <FileText className="h-8 w-8 text-gray-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pending Approval</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</p>
                                <p className="text-xs text-gray-500">Requires your review</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Approved Orders</p>
                                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                                <p className="text-xs text-gray-500">Ready for processing</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Value</p>
                                <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalValue)}</p>
                                <p className="text-xs text-gray-500">Avg: {formatCurrency(stats.averageOrderValue)}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by order number, client, or title..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending Approval</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="ready">Ready</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter by creator" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Creators</SelectItem>
                                <SelectItem value="sales_agent">Sales Agents</SelectItem>
                                <SelectItem value="office_employee">Office Employees</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Orders ({filteredOrders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order Details</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Invoice Check</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.map((order) => {
                                    const StatusIcon = getStatusIcon(order.orderStatus);
                                    const invoiceIssues = verifyInvoiceDetails(order);
                                    const hasIssues = invoiceIssues.length > 0;

                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium text-gray-900">{order.orderNumber}</div>
                                                    {order.orderTitle && (
                                                        <div className="text-sm text-gray-600">{order.orderTitle}</div>
                                                    )}
                                                    <div className="text-xs text-gray-500">
                                                        {formatDate(order.orderDate)}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-gray-900">{order.client}</div>
                                                {order.expectedDeliveryDate && (
                                                    <div className="text-xs text-gray-500">
                                                        Due: {formatDate(order.expectedDeliveryDate)}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                    <div>
                                                        <div className="text-sm font-medium">
                                                            {order.createdByRole === 'sales_agent' ? 'Sales Agent' : 'Office Employee'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{order.createdBy || 'Unknown'}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-gray-900">
                                                    {formatCurrency(order.totalAmount)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {order.items?.length || 0} items
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${getStatusColor(order.orderStatus)} flex items-center space-x-1`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    <span>{order.orderStatus.replace('_', ' ').toUpperCase()}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {hasIssues ? (
                                                    <div className="flex items-center space-x-1 text-red-600">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        <span className="text-xs">{invoiceIssues.length} issues</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-1 text-green-600">
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span className="text-xs">Verified</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedOrder(order);
                                                            setIsDetailsDialogOpen(true);
                                                        }}
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                    </Button>
                                                    {order.orderStatus === 'pending' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedOrder(order);
                                                                setIsApprovalDialogOpen(true);
                                                            }}
                                                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                                        >
                                                            Review
                                                        </Button>
                                                    )}
                                                    {['processing', 'ready', 'shipped'].includes(order.orderStatus) && (
                                                        <Select
                                                            value={order.orderStatus}
                                                            onValueChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
                                                        >
                                                            <SelectTrigger className="w-32 h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="processing">Processing</SelectItem>
                                                                <SelectItem value="ready">Ready</SelectItem>
                                                                <SelectItem value="shipped">Shipped</SelectItem>
                                                                <SelectItem value="delivered">Delivered</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {filteredOrders.length === 0 && (
                        <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No orders found</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Order Details Dialog */}
            <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Order Details - {selectedOrder?.orderNumber}</DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-6">
                            {/* Order Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-medium text-gray-600">Client</Label>
                                    <p className="text-lg font-semibold">{selectedOrder.client}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-600">Order Date</Label>
                                    <p>{formatDate(selectedOrder.orderDate)}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-600">Expected Delivery</Label>
                                    <p>{selectedOrder.expectedDeliveryDate ? formatDate(selectedOrder.expectedDeliveryDate) : 'Not specified'}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-600">Created By</Label>
                                    <p>{selectedOrder.createdByRole === 'sales_agent' ? 'Sales Agent' : 'Office Employee'}</p>
                                </div>
                            </div>

                            {/* Invoice Verification */}
                            <div className="border rounded-lg p-4">
                                <h3 className="font-semibold mb-3">Invoice Verification</h3>
                                {(() => {
                                    const issues = verifyInvoiceDetails(selectedOrder);
                                    return issues.length > 0 ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2 text-red-600">
                                                <AlertTriangle className="h-4 w-4" />
                                                <span className="font-medium">Issues Found:</span>
                                            </div>
                                            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                                                {issues.map((issue, index) => (
                                                    <li key={index}>{issue}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2 text-green-600">
                                            <CheckCircle className="h-4 w-4" />
                                            <span>All invoice details verified</span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Order Items */}
                            <div>
                                <h3 className="font-semibold mb-3">Order Items</h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item</TableHead>
                                                <TableHead>Quantity</TableHead>
                                                <TableHead>Unit Price</TableHead>
                                                <TableHead>Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedOrder.items?.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell>{item.quantity} {item.unit || 'pcs'}</TableCell>
                                                    <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                                    <TableCell>{formatCurrency(item.total || (item.quantity * item.unitPrice))}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Pricing Summary */}
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <h3 className="font-semibold mb-3">Pricing Summary</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span>{formatCurrency(selectedOrder.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                                        <span>Total:</span>
                                        <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedOrder.notes && (
                                <div>
                                    <Label className="text-sm font-medium text-gray-600">Notes</Label>
                                    <p className="mt-1 p-3 bg-gray-50 rounded-lg">{selectedOrder.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Approval Dialog */}
            <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Review Order - {selectedOrder?.orderNumber}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm font-medium">Action</Label>
                            <Select value={approvalAction} onValueChange={(value: 'approve' | 'reject' | 'modify') => setApprovalAction(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="approve">
                                        <div className="flex items-center space-x-2">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <span>Approve Order</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="reject">
                                        <div className="flex items-center space-x-2">
                                            <XCircle className="h-4 w-4 text-red-600" />
                                            <span>Reject Order</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="modify">
                                        <div className="flex items-center space-x-2">
                                            <Edit className="h-4 w-4 text-orange-600" />
                                            <span>Request Modifications</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {approvalAction === 'modify' && (
                            <div>
                                <Label className="text-sm font-medium">Modification Details</Label>
                                <Textarea
                                    placeholder="Specify what needs to be modified..."
                                    value={modificationDetails}
                                    onChange={(e) => setModificationDetails(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        )}

                        <div>
                            <Label className="text-sm font-medium">
                                {approvalAction === 'approve' ? 'Approval Notes (Optional)' :
                                    approvalAction === 'reject' ? 'Rejection Reason (Required)' :
                                        'Additional Notes (Required)'}
                            </Label>
                            <Textarea
                                placeholder={
                                    approvalAction === 'approve' ? 'Optional notes about the approval...' :
                                        approvalAction === 'reject' ? 'Please provide a reason for rejection...' :
                                            'Additional notes about the modifications...'
                                }
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleApprovalAction}
                                className={
                                    approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                                        approvalAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                                            'bg-orange-600 hover:bg-orange-700'
                                }
                            >
                                {approvalAction === 'approve' ? 'Approve Order' :
                                    approvalAction === 'reject' ? 'Reject Order' :
                                        'Request Modifications'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}