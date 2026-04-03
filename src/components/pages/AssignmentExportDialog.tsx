import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Download, Loader, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Assignment {
  id: string;
  siteId: string;
  workerId: string;
  carId?: string;
  assignedDate: string;
  status: string;
  notes?: string;
  createdAt: string;
  site?: { id: string; name: string; address: string };
  worker?: { id: string; fullName: string; email: string; phone?: string };
  car?: { id: string; name: string; number: string };
}

interface AssignmentReport {
  id: string;
  assignmentId: string;
  assignmentDate: string;
  workerName: string;
  workerEmail: string;
  workerPhone: string;
  siteName: string;
  siteAddress: string;
  carName: string;
  carNumber: string;
  status: string;
  notes: string;
}

interface AssignmentExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: Assignment[];
}

export function AssignmentExportDialog({ isOpen, onClose, assignments }: AssignmentExportDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'filters' | 'preview'>('filters');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<AssignmentReport[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [searchAssignment, setSearchAssignment] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const filteredAssignments = assignments.filter(a => {
    if (!searchAssignment.trim()) return true;

    const searchTerm = searchAssignment.toLowerCase().trim();
    return (
      (a.worker?.fullName?.toLowerCase() || '').includes(searchTerm) ||
      (a.site?.name?.toLowerCase() || '').includes(searchTerm) ||
      (a.worker?.email?.toLowerCase() || '').includes(searchTerm)
    );
  });

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchAssignment(value);
    if (value.trim()) {
      setIsDropdownOpen(true);
    }
  };

  // Handle assignment selection and set default date from
  const handleAssignmentSelect = (assignmentId: string) => {
    setSelectedAssignment(assignmentId);
    setIsDropdownOpen(false);

    if (assignmentId) {
      // Find the selected assignment and set date from to their creation date
      const selectedAssignmentData = assignments.find(a => a.id === assignmentId);
      if (selectedAssignmentData) {
        const creationDate = new Date(selectedAssignmentData.createdAt).toISOString().split('T')[0];
        setDateFrom(creationDate);

        // Reset date to when assignment changes
        setDateTo('');

        // Clear search after selection for better UX
        setSearchAssignment('');
      }
    } else {
      // If no specific assignment selected, reset dates
      setDateFrom('');
      setDateTo('');
    }
  };

  // Handle date from change and validate date to
  const handleDateFromChange = (newDateFrom: string) => {
    const today = new Date().toISOString().split('T')[0];

    // Check if the selected date is in the future
    if (newDateFrom > today) {
      toast.error('Date From cannot be in the future');
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
      toast.error('Date To cannot be in the future');
      return;
    }

    if (dateFrom && new Date(newDateTo) < new Date(dateFrom)) {
      toast.error('Date To must be on or after Date From');
      return;
    }
    setDateTo(newDateTo);
  };

  const handleClose = () => {
    resetFilters();
    onClose();
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  const handleApplyFilters = async () => {
    try {
      // Validate filters
      if (selectedAssignment) {
        if (!dateFrom || !dateTo) {
          toast.error('Please select both date from and date to when an assignment is selected');
          return;
        }

        if (new Date(dateFrom) > new Date(dateTo)) {
          toast.error('Date from must be on or before date to');
          return;
        }
      }

      // If dates are provided, validate them
      if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
        toast.error('Date from must be on or before date to');
        return;
      }

      // Check if date to is in the future
      const today = new Date().toISOString().split('T')[0];
      if (dateTo && dateTo > today) {
        toast.error('Date To cannot be in the future');
        return;
      }

      if (dateFrom && dateFrom > today) {
        toast.error('Date From cannot be in the future');
        return;
      }

      setIsLoading(true);

      // Fetch report data from API
      const response = await fetch('/api/assignments/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: selectedAssignment || null,
          status: statusFilter !== 'all' ? statusFilter : null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          format: exportFormat,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReportData(data.report || []);
      setStep('preview');
      toast.success('Report generated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsLoading(true);

      // Call export API
      const response = await fetch('/api/assignments/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: selectedAssignment || null,
          status: statusFilter !== 'all' ? statusFilter : null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          format: exportFormat,
          export: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assignment-report-${new Date().getTime()}.${exportFormat === 'pdf' ? 'pdf' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Report exported as ${exportFormat.toUpperCase()}`);
      onClose();
      resetFilters();
    } catch (error: any) {
      toast.error(error.message || 'Failed to export report');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedAssignment('');
    setSearchAssignment('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setExportFormat('pdf');
    setStep('filters');
    setReportData([]);
    setIsDropdownOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('assignments.exportReportTitle')}</DialogTitle>
        </DialogHeader>

        {step === 'filters' ? (
          <div className="space-y-[50px] py-4 overflow-y-auto flex-1">
            {/* Assignment Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('assignments.exportSelectAssignment')}</Label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input
                    ref={searchInputRef}
                    placeholder={t('assignments.exportSearchPlaceholder')}
                    value={searchAssignment}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="pl-10 pr-8"
                  />
                  {searchAssignment && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchAssignment('');
                        setIsDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Selected Assignment Display */}
                {selectedAssignment && !searchAssignment && (
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
                          {assignments.find(a => a.id === selectedAssignment)?.worker?.fullName} - {assignments.find(a => a.id === selectedAssignment)?.site?.name}
                        </p>
                        <p className="text-sm text-blue-700">
                          {assignments.find(a => a.id === selectedAssignment)?.worker?.email}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                )}

                {/* Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredAssignments.length > 0 ? (
                      filteredAssignments.map(assignment => (
                        <div
                          key={assignment.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${selectedAssignment === assignment.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                            }`}
                          onClick={() => handleAssignmentSelect(assignment.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{assignment.worker?.fullName} - {assignment.site?.name}</p>
                              <p className="text-sm text-gray-600">{assignment.worker?.email}</p>
                              <p className="text-xs text-gray-500">{t('assignments.exportAssigned')}: {new Date(assignment.assignedDate).toLocaleDateString()}</p>
                            </div>
                            {selectedAssignment === assignment.id && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        {searchAssignment ? t('assignments.exportNoMatches') : t('assignments.exportNoAssignments')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Search Results Info */}
              {searchAssignment && filteredAssignments.length > 0 && (
                <p className="text-xs text-gray-500">
                  {t('assignments.exportShowingMatches', { count: filteredAssignments.length, search: searchAssignment })}
                </p>
              )}
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('assignments.exportStatus')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('assignments.exportAllStatus')}</SelectItem>
                  <SelectItem value="active">{t('assignments.exportActive')}</SelectItem>
                  <SelectItem value="completed">{t('assignments.exportCompleted')}</SelectItem>
                  <SelectItem value="cancelled">{t('assignments.exportCancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('assignments.exportDateFrom')} {selectedAssignment ? '*' : t('assignments.exportOptional')}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={!selectedAssignment}
                />
                {selectedAssignment && dateFrom && (
                  <p className="text-xs text-gray-500">
                    {t('assignments.exportSetToCreation', { date: new Date(dateFrom).toLocaleDateString() })}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('assignments.exportDateTo')} {selectedAssignment ? '*' : t('assignments.exportOptional')}</Label>
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
                    {t('assignments.exportMustBeAfter', { date: new Date(dateFrom).toLocaleDateString() })}
                  </p>
                )}
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('assignments.exportFormat')}</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">{t('assignments.exportPdf')}</SelectItem>
                  <SelectItem value="csv">{t('assignments.exportCsv')}</SelectItem>
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
                    {t('assignments.exportGenerating')}
                  </>
                ) : t('assignments.exportPreviewReport')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Report Preview */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('assignments.exportReportPreview')}</h3>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('assignments.exportAssignmentId')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('assignments.exportDate')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('assignments.exportWorkerName')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('assignments.exportWorkerEmail')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('assignments.exportWorkerPhone')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('assignments.exportSiteName')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('assignments.exportSiteAddress')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('assignments.exportCar')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('assignments.exportStatusCol')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('assignments.exportNotes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length > 0 ? (
                      reportData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{row.assignmentId.substring(0, 8)}</td>
                          <td className="px-4 py-3 text-gray-600">{row.assignmentDate}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium">{row.workerName}</td>
                          <td className="px-4 py-3 text-gray-600">{row.workerEmail}</td>
                          <td className="px-4 py-3 text-gray-600">{row.workerPhone || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{row.siteName}</td>
                          <td className="px-4 py-3 text-gray-600">{row.siteAddress}</td>
                          <td className="px-4 py-3 text-gray-600">{row.carName ? `${row.carName} (${row.carNumber})` : '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{row.status}</td>
                          <td className="px-4 py-3 text-gray-600">{row.notes || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                          {t('assignments.exportNoData')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Total Records:</span> {reportData.length}
              </p>
              {reportData.length > 0 && (
                <>
                  <p className="text-sm text-blue-900 mt-2">
                    <span className="font-semibold">Active:</span> {reportData.filter(r => r.status === 'active').length}
                  </p>
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Completed:</span> {reportData.filter(r => r.status === 'completed').length}
                  </p>
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Cancelled:</span> {reportData.filter(r => r.status === 'cancelled').length}
                  </p>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('filters')} disabled={isLoading}>
                {t('assignments.exportBackToFilters')}
              </Button>
              <Button onClick={handleExport} disabled={isLoading || reportData.length === 0}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('assignments.exportExporting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export as {exportFormat.toUpperCase()}
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
