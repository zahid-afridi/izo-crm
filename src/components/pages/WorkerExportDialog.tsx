import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Download, Loader, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { type Worker } from '@/hooks/useWorkers';

interface WorkerReport {
  id: string;
  workerId: string;
  workerName: string;
  email: string;
  phone: string;
  status: string;
  employeeType: string;
  totalAssignments: number;
  timeSpent: string;
  attendanceCount: number;
  createdDate: string;
}

interface WorkerExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workers: Worker[];
}

export function WorkerExportDialog({ isOpen, onClose, workers }: WorkerExportDialogProps) {
  const { t } = useTranslation();

  const getTranslatedStatus = (status: string) => {
    if (status === 'active') return t('workers.statusActive');
    if (status === 'on_leave') return t('workers.statusOnLeave');
    if (status === 'disabled') return t('workers.statusRemoved');
    return status;
  };
  const getTranslatedEmployeeType = (type: string) => {
    if (type === 'full-time') return t('workers.employeeTypeFullTime');
    if (type === 'part-time') return t('workers.employeeTypePartTime');
    if (type === 'contract') return t('workers.employeeTypeContract');
    return type;
  };
  const [step, setStep] = useState<'filters' | 'preview'>('filters');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<WorkerReport[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [selectedWorker, setSelectedWorker] = useState('');
  const [searchWorker, setSearchWorker] = useState('');
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

  const filteredWorkers = workers.filter(w => {
    if (!searchWorker.trim()) return true;

    const searchTerm = searchWorker.toLowerCase().trim();
    return (
      w.fullName.toLowerCase().includes(searchTerm) ||
      w.email.toLowerCase().includes(searchTerm) ||
      (w.phone && w.phone.toLowerCase().includes(searchTerm)) ||
      w.role.toLowerCase().includes(searchTerm)
    );
  });

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchWorker(value);
    if (value.trim()) {
      setIsDropdownOpen(true);
    }
  };

  // Handle worker selection and set default date from
  const handleWorkerSelect = (workerId: string) => {
    setSelectedWorker(workerId);
    setIsDropdownOpen(false);

    // Find the selected worker and set date from to their creation date
    const selectedWorkerData = workers.find(w => w.id === workerId);
    if (selectedWorkerData && selectedWorkerData.createdAt) {
      const creationDate = new Date(selectedWorkerData.createdAt).toISOString().split('T')[0];
      setDateFrom(creationDate);

      // Reset date to when worker changes
      setDateTo('');

      // Clear search after selection for better UX
      setSearchWorker('');
    }
  };

  // Handle date from change and validate date to
  const handleDateFromChange = (newDateFrom: string) => {
    const today = new Date().toISOString().split('T')[0];

    // Check if the selected date is in the future
    if (newDateFrom > today) {
      toast.error(t('workers.exportDateFromFuture'));
      return;
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
      toast.error(t('workers.exportDateToFuture'));
      return;
    }

    if (dateFrom && new Date(newDateTo) < new Date(dateFrom)) {
      toast.error(t('workers.exportDateToAfterFrom'));
      return;
    }
    setDateTo(newDateTo);
  };

  const handleApplyFilters = async () => {
    try {
      // Validate filters
      if (!selectedWorker) {
        toast.error(t('workers.exportSelectWorkerRequired'));
        return;
      }

      if (!dateFrom || !dateTo) {
        toast.error(t('workers.exportSelectBothDates'));
        return;
      }

      if (new Date(dateFrom) > new Date(dateTo)) {
        toast.error(t('workers.exportDateFromBeforeTo'));
        return;
      }

      // Check if date to is in the future
      const today = new Date().toISOString().split('T')[0];
      if (dateTo > today) {
        toast.error(t('workers.exportDateToFuture'));
        return;
      }

      setIsLoading(true);

      // Fetch report data from API
      const response = await fetch('/api/workers/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: selectedWorker,
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
      toast.success(t('workers.exportReportGenerated'));
    } catch (error: any) {
      toast.error(error.message || t('workers.exportReportFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Additional validation before export
      const today = new Date().toISOString().split('T')[0];
      if (dateTo > today || dateFrom > today) {
        toast.error(t('workers.exportFutureDatesError'));
        return;
      }

      setIsLoading(true);

      // Call export API with retry mechanism
      let response;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          response = await fetch('/api/workers/export-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workerId: selectedWorker,
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
          throw new Error('Network connection failed. Please check your internet connection.');
        }
      }

      if (!response || !response.ok) {
        const errorData = await response?.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData?.details || errorData?.error || t('workers.exportExportFailed'));
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Set correct file extension based on format
      const fileExtension = exportFormat === 'pdf' ? 'pdf' : 'csv';
      a.download = `worker-report-${selectedWorker}.${fileExtension}`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('workers.exportReportExported', { format: exportFormat.toUpperCase() }));
      onClose();
      resetFilters();
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || t('workers.exportExportFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedWorker('');
    setSearchWorker('');
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
          <DialogTitle>{t('workers.exportModalTitle')}</DialogTitle>
        </DialogHeader>

        {step === 'filters' ? (
          <div className="space-y-[50px] py-4 overflow-y-auto flex-1">
            {/* Worker Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('workers.exportSelectWorker')}</Label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input
                    ref={searchInputRef}
                    placeholder={t('workers.exportSearchPlaceholder')}
                    value={searchWorker}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="pl-10 pr-8"
                  />
                  {searchWorker && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchWorker('');
                        setIsDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Selected Worker Display */}
                {selectedWorker && !searchWorker && (
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
                          {workers.find(w => w.id === selectedWorker)?.fullName}
                        </p>
                        <p className="text-sm text-blue-700">
                          {workers.find(w => w.id === selectedWorker)?.email}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                )}

                {/* Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredWorkers.length > 0 ? (
                      filteredWorkers.map(worker => (
                        <div
                          key={worker.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${selectedWorker === worker.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                            }`}
                          onClick={() => handleWorkerSelect(worker.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{worker.fullName}</p>
                              <p className="text-sm text-gray-600">{worker.email}</p>
                              {worker.phone && (
                                <p className="text-xs text-gray-500">{worker.phone}</p>
                              )}
                            </div>
                            {selectedWorker === worker.id && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        {searchWorker ? t('workers.exportNoWorkersMatch') : t('workers.exportNoWorkersAvailable')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Search Results Info */}
              {searchWorker && filteredWorkers.length > 0 && (
                <p className="text-xs text-gray-500">
                  {t('workers.exportShowingWorkers', { count: filteredWorkers.length, search: searchWorker })}
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('workers.exportDateFrom')}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={!selectedWorker}
                />
                {selectedWorker && dateFrom && (
                  <p className="text-xs text-gray-500">
                    {t('workers.exportSetToCreationDate', { date: new Date(dateFrom).toLocaleDateString() })}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('workers.exportDateTo')}</Label>
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
                    {t('workers.exportMustBeOnOrAfter', { date: new Date(dateFrom).toLocaleDateString() })}
                  </p>
                )}
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('workers.exportFormat')}</Label>
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
                    {t('workers.exportGenerating')}
                  </>
                ) : (
                  t('workers.exportPreviewReport')
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Report Preview */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('workers.exportReportPreview')}</h3>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('workers.exportWorkerName')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('common.email')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('workers.phone')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('workers.status')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('workers.employeeType')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('workers.exportAssignments')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('workers.exportTimeWorked')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length > 0 ? (
                      reportData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium">{row.workerName}</td>
                          <td className="px-4 py-3 text-gray-600">{row.email}</td>
                          <td className="px-4 py-3 text-gray-600">{row.phone}</td>
                          <td className="px-4 py-3 text-gray-600">{getTranslatedStatus(row.status)}</td>
                          <td className="px-4 py-3 text-gray-600">{getTranslatedEmployeeType(row.employeeType)}</td>
                          <td className="px-4 py-3 text-gray-600">{row.totalAssignments}</td>
                          <td className="px-4 py-3 text-gray-600 font-medium">
                            {row.timeSpent === 'No time logged' ? t('workers.exportNoTimeLogged') : row.timeSpent}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          {t('workers.exportNoDataAvailable')}
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
                  <span className="font-semibold text-blue-900">{t('workers.exportTotalRecords')}</span>
                  <span className="ml-2 text-blue-800">{reportData.length}</span>
                </div>
                <div>
                  <span className="font-semibold text-blue-900">{t('workers.exportDateRange')}</span>
                  <span className="ml-2 text-blue-800">
                    {dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}` : t('workers.exportAllTime')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-blue-900">{t('workers.exportTotalTimeLogged')}</span>
                  <span className="ml-2 text-blue-800">
                    {reportData.reduce((total, row) => {
                      if (row.timeSpent === 'No time logged') return total;
                      const match = row.timeSpent.match(/(\d+)h (\d+)m/);
                      if (match) {
                        return total + parseInt(match[1]) * 60 + parseInt(match[2]);
                      }
                      return total;
                    }, 0) > 0 ? (() => {
                      const totalMinutes = reportData.reduce((total, row) => {
                        if (row.timeSpent === 'No time logged') return total;
                        const match = row.timeSpent.match(/(\d+)h (\d+)m/);
                        if (match) {
                          return total + parseInt(match[1]) * 60 + parseInt(match[2]);
                        }
                        return total;
                      }, 0);
                      const hours = Math.floor(totalMinutes / 60);
                      const minutes = totalMinutes % 60;
                      return `${hours}h ${minutes}m`;
                    })() : t('workers.exportNoTimeLogged')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('filters')} disabled={isLoading}>
                {t('workers.exportBackToFilters')}
              </Button>
              <Button onClick={handleExport} disabled={isLoading || reportData.length === 0}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('workers.exportExporting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t('workers.exportExportAs', { format: exportFormat.toUpperCase() })}
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
