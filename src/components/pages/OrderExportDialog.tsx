import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Download, Loader, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  orderNumber: string;
  orderTitle?: string;
  client: string;
  orderDate: string;
  orderStatus: string;
  totalAmount: number;
  createdAt: string;
}

interface OrderReport {
  id: string;
  orderId: string;
  orderNumber: string;
  orderTitle?: string;
  client: string;
  orderDate: string;
  orderStatus: string;
  totalAmount: number;
}

interface OrderExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
}

export function OrderExportDialog({ isOpen, onClose, orders }: OrderExportDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'filters' | 'preview'>('filters');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<OrderReport[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [selectedOrder, setSelectedOrder] = useState('');
  const [searchOrder, setSearchOrder] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const filteredOrders = orders.filter(o => {
    if (!searchOrder.trim()) return true;
    
    const searchTerm = searchOrder.toLowerCase().trim();
    return (
      o.orderNumber.toLowerCase().includes(searchTerm) ||
      o.client.toLowerCase().includes(searchTerm) ||
      (o.orderTitle && o.orderTitle.toLowerCase().includes(searchTerm))
    );
  });

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchOrder(value);
    if (value.trim()) {
      setIsDropdownOpen(true);
    }
  };

  // Handle order selection and set default date from
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrder(orderId);
    setIsDropdownOpen(false);
    
    // Find the selected order and set date from to their creation date
    const selectedOrderData = orders.find(o => o.id === orderId);
    if (selectedOrderData) {
      const creationDate = new Date(selectedOrderData.createdAt).toISOString().split('T')[0];
      setDateFrom(creationDate);
      
      // Reset date to when order changes
      setDateTo('');
      
      // Clear search after selection for better UX
      setSearchOrder('');
    }
  };

  // Handle date from change and validate date to
  const handleDateFromChange = (newDateFrom: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if the selected date is in the future
    if (newDateFrom > today) {
      toast.error(t('orders.export.dateFromFuture'));
      return;
    }
    
    // Check if the selected date is before the order's creation date
    const selectedOrderData = orders.find(o => o.id === selectedOrder);
    if (selectedOrderData?.createdAt) {
      const creationDate = new Date(selectedOrderData.createdAt).toISOString().split('T')[0];
      if (newDateFrom < creationDate) {
        toast.error(t('orders.export.dateFromBeforeCreation'));
        return;
      }
    }
    
    setDateFrom(newDateFrom);
    
    // If date to is set and is before new date from, reset it
    if (dateTo && new Date(dateTo) < new Date(newDateFrom)) {
      setDateTo('');
    }
  };

  // Handle date to change with validation
  const handleDateToChange = (newDateTo: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if the selected date is in the future
    if (newDateTo > today) {
      toast.error(t('orders.export.dateToFuture'));
      return;
    }
    
    if (dateFrom && new Date(newDateTo) < new Date(dateFrom)) {
      toast.error(t('orders.export.dateToAfterFrom'));
      return;
    }
    setDateTo(newDateTo);
  };

  const handleApplyFilters = async () => {
    try {
      // Validate filters
      if (!selectedOrder) {
        toast.error(t('orders.export.pleaseSelectOrder'));
        return;
      }

      if (!dateFrom || !dateTo) {
        toast.error(t('orders.export.selectBothDates'));
        return;
      }

      if (new Date(dateFrom) > new Date(dateTo)) {
        toast.error(t('orders.export.dateFromBeforeTo'));
        return;
      }

      // Check if date to is in the future
      const today = new Date().toISOString().split('T')[0];
      if (dateTo > today) {
        toast.error(t('orders.export.dateToFuture'));
        return;
      }

      setIsLoading(true);

      // Fetch report data from API
      const response = await fetch('/api/orders/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder,
          dateFrom,
          dateTo,
          format: exportFormat,
        }),
      });

      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        
        // Handle specific error types
        if (errorData.code === 'DB_CONNECTION_ERROR') {
          throw new Error('Database connection failed. Please check your internet connection and try again.');
        } else if (errorData.code === 'DB_TIMEOUT_ERROR') {
          throw new Error('Request timeout. Please try with a smaller date range.');
        } else {
          throw new Error(errorData.details || errorData.error || `Failed to generate report: ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('API Response data:', data);
      setReportData(data.report || []);
      setStep('preview');
      toast.success(t('orders.export.reportGenerated'));
    } catch (error: any) {
      toast.error(error.message || t('orders.export.exportFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Additional validation before export
      const today = new Date().toISOString().split('T')[0];
      if (dateTo > today || dateFrom > today) {
        toast.error(t('orders.export.noFutureDates'));
        return;
      }

      setIsLoading(true);

      // Call export API with retry mechanism
      let response;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          response = await fetch('/api/orders/export-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: selectedOrder,
              dateFrom,
              dateTo,
              format: exportFormat,
              export: true,
            }),
          });
          
          if (response.ok) {
            break; // Success, exit retry loop
          }
          
          // If it's a 503 (service unavailable) or 504 (timeout), retry
          if ((response.status === 503 || response.status === 504) && retryCount < maxRetries) {
            console.log(`Retry attempt ${retryCount + 1} after ${response.status} error`);
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Wait 2s, 4s
            continue;
          }
          
          // For other errors, don't retry
          break;
          
        } catch (networkError) {
          console.error('Network error:', networkError);
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            continue;
          }
          throw new Error(t('orders.export.networkFailed'));
        }
      }

      if (!response || !response.ok) {
        const errorData = await response?.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData?.details || errorData?.error || t('orders.export.exportFailed'));
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set correct file extension based on format
      const fileExtension = exportFormat === 'pdf' ? 'pdf' : 'csv';
      a.download = `order-report-${selectedOrder}.${fileExtension}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('orders.export.reportExported', { format: exportFormat.toUpperCase() }));
      onClose();
      resetFilters();
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || t('orders.export.exportFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedOrder('');
    setSearchOrder('');
    setDateFrom('');
    setDateTo('');
    setExportFormat('pdf');
    setStep('filters');
    setReportData([]);
    setIsDropdownOpen(false);
  };

  const handleClose = () => {
    resetFilters();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('orders.export.title')}</DialogTitle>
        </DialogHeader>

        {step === 'filters' ? (
          <div className="space-y-[50px] py-4 overflow-y-auto flex-1">
            {/* Order Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('orders.export.selectOrder')}</Label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input
                    ref={searchInputRef}
                    placeholder={t('orders.export.searchOrderPlaceholder')}
                    value={searchOrder}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="pl-10 pr-8"
                  />
                  {searchOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOrder('');
                        setIsDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Selected Order Display */}
                {selectedOrder && !searchOrder && (
                  <div 
                    className="mt-2 p-3 border rounded-md bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => {
                      setIsDropdownOpen(true);
                      searchInputRef.current?.focus();
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900">
                          {orders.find(o => o.id === selectedOrder)?.orderNumber}
                        </p>
                        <p className="text-sm text-blue-700">
                          {orders.find(o => o.id === selectedOrder)?.client}
                        </p>
                        {orders.find(o => o.id === selectedOrder)?.orderTitle && (
                          <p className="text-xs text-blue-600">
                            {orders.find(o => o.id === selectedOrder)?.orderTitle}
                          </p>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                )}

                {/* Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map(order => (
                        <div
                          key={order.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                            selectedOrder === order.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => handleOrderSelect(order.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{order.orderNumber}</p>
                              <p className="text-sm text-gray-600">{order.client}</p>
                              {order.orderTitle && (
                                <p className="text-xs text-gray-500">{order.orderTitle}</p>
                              )}
                            </div>
                            {selectedOrder === order.id && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        {searchOrder ? t('orders.export.noOrdersMatchingSearch') : t('orders.export.noOrdersAvailable')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Search Results Info */}
              {searchOrder && filteredOrders.length > 0 && (
                <p className="text-xs text-gray-500">
                  {t('orders.export.showingOrdersMatching', { count: filteredOrders.length, query: searchOrder })}
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('orders.export.dateFrom')}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  min={selectedOrder ? (() => {
                    const o = orders.find(ord => ord.id === selectedOrder);
                    return o?.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : undefined;
                  })() : undefined}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={!selectedOrder}
                />
                {selectedOrder && dateFrom && (
                  <p className="text-xs text-gray-500">
                    {t('orders.export.setToOrderCreationDate', { date: new Date(dateFrom).toLocaleDateString() })}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('orders.export.dateTo')}</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  min={dateFrom}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={!dateFrom}
                />
                {dateFrom && (
                  <p className="text-xs text-gray-500">
                    {t('orders.export.mustBeOnOrAfter', { date: new Date(dateFrom).toLocaleDateString() })}
                  </p>
                )}
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('orders.export.exportFormat')}</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleApplyFilters} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('orders.export.generating')}
                  </>
                ) : (
                  t('orders.export.previewReport')
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Report Preview */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('orders.export.reportPreview')}</h3>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('orders.orderNumber')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('orders.orderTitle')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('orders.client')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('orders.orderDate')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('common.status')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('orders.totalAmount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length > 0 ? (
                      reportData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium">{row.orderNumber}</td>
                          <td className="px-4 py-3 text-gray-600">{row.orderTitle || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{row.client}</td>
                          <td className="px-4 py-3 text-gray-600">{new Date(row.orderDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-gray-600">{row.orderStatus}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium">€{row.totalAmount.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          {t('orders.export.noDataForFilters')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-blue-900">{t('orders.export.totalRecords')}</span>
                  <span className="ml-2 text-blue-800">{reportData.length}</span>
                </div>
                <div>
                  <span className="font-semibold text-blue-900">{t('orders.export.dateRange')}</span>
                  <span className="ml-2 text-blue-800">
                    {dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}` : t('orders.export.allTime')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-blue-900">{t('orders.export.totalOrderValue')}</span>
                  <span className="ml-2 text-blue-800">
                    €{reportData.reduce((total, row) => total + row.totalAmount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('filters')} disabled={isLoading}>
                {t('orders.export.backToFilters')}
              </Button>
              <Button onClick={handleExport} disabled={isLoading || reportData.length === 0}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('orders.export.exporting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t('orders.export.exportAs', { format: exportFormat.toUpperCase() })}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
