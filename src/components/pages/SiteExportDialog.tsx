import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Download, Loader, CheckCircle, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Site {
  id: string;
  name: string;
  address: string;
  city?: string;
  status: string;
  progress: number;
  createdAt: string;
}

interface SiteReport {
  id: string;
  siteId: string;
  siteName: string;
  address: string;
  workersAssigned: number;
  progress: number;
  siteManager: string;
  totalTime: string;
  status: string;
}

interface SiteExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sites: Site[];
}

export function SiteExportDialog({ isOpen, onClose, sites }: SiteExportDialogProps) {
  const [step, setStep] = useState<'filters' | 'preview'>('filters');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<SiteReport[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [selectedSite, setSelectedSite] = useState('');
  const [searchSite, setSearchSite] = useState('');
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

  const filteredSites = sites.filter(s => {
    if (!searchSite.trim()) return true;

    const searchTerm = searchSite.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(searchTerm) ||
      s.address.toLowerCase().includes(searchTerm) ||
      (s.city && s.city.toLowerCase().includes(searchTerm)) ||
      s.status.toLowerCase().includes(searchTerm)
    );
  });

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchSite(value);
    if (value.trim()) {
      setIsDropdownOpen(true);
    }
  };

  // Handle site selection and set default date from
  const handleSiteSelect = (siteId: string) => {
    setSelectedSite(siteId);
    setIsDropdownOpen(false);

    // Find the selected site and set date from to their creation date
    const selectedSiteData = sites.find(s => s.id === siteId);
    if (selectedSiteData) {
      const creationDate = new Date(selectedSiteData.createdAt).toISOString().split('T')[0];
      setDateFrom(creationDate);

      // Reset date to when site changes
      setDateTo('');

      // Clear search after selection for better UX
      setSearchSite('');
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

    // Check if the selected date is before the site's creation date
    const selectedSiteData = sites.find(s => s.id === selectedSite);
    if (selectedSiteData?.createdAt) {
      const creationDate = new Date(selectedSiteData.createdAt).toISOString().split('T')[0];
      if (newDateFrom < creationDate) {
        toast.error('Date From cannot be earlier than site creation date');
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
      toast.error('Date To cannot be in the future');
      return;
    }

    if (dateFrom && new Date(newDateTo) < new Date(dateFrom)) {
      toast.error('Date To must be on or after Date From');
      return;
    }
    setDateTo(newDateTo);
  };

  const handleApplyFilters = async () => {
    try {
      // Validate filters
      if (!selectedSite || selectedSite === 'no-sites') {
        toast.error('Please select a site');
        return;
      }

      if (!dateFrom || !dateTo) {
        toast.error('Please select both date from and date to');
        return;
      }

      if (new Date(dateFrom) > new Date(dateTo)) {
        toast.error('Date from must be on or before date to');
        return;
      }

      // Check if date to is in the future
      const today = new Date().toISOString().split('T')[0];
      if (dateTo > today || dateFrom > today) {
        toast.error('Cannot export reports with future dates');
        return;
      }

      setIsLoading(true);

      // Fetch report data from API
      const response = await fetch('/api/sites/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSite,
          dateFrom,
          dateTo,
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
      // Additional validation before export
      const today = new Date().toISOString().split('T')[0];
      if (dateTo > today || dateFrom > today) {
        toast.error('Cannot export reports with future dates');
        return;
      }

      setIsLoading(true);

      // Call export API
      const response = await fetch('/api/sites/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSite,
          dateFrom,
          dateTo,
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
      a.download = `site-report-${selectedSite}.${exportFormat === 'pdf' ? 'pdf' : 'csv'}`;
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
    setSelectedSite('');
    setSearchSite('');
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
      <DialogContent className="max-w-7xl w-[98vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Site Report</DialogTitle>
        </DialogHeader>

        {step === 'filters' ? (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Site Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select Site *</Label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search site by name or address..."
                    value={searchSite}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="pl-10 pr-8"
                  />
                  {searchSite && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchSite('');
                        setIsDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Selected Site Display */}
                {selectedSite && !searchSite && (
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
                          {sites.find(s => s.id === selectedSite)?.name}
                        </p>
                        <p className="text-sm text-blue-700">
                          {sites.find(s => s.id === selectedSite)?.address}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                )}

                {/* Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredSites.length > 0 ? (
                      filteredSites.map(site => (
                        <div
                          key={site.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${selectedSite === site.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                            }`}
                          onClick={() => handleSiteSelect(site.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{site.name}</p>
                              <p className="text-sm text-gray-600">{site.address}</p>
                              {site.city && (
                                <p className="text-xs text-gray-500">{site.city}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">{site.progress}%</span>
                              {site.progress === 100 && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                              {selectedSite === site.id && (
                                <Check className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        {searchSite ? 'No sites found matching your search' : 'No sites available'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Search Results Info */}
              {searchSite && filteredSites.length > 0 && (
                <p className="text-xs text-gray-500">
                  Showing {filteredSites.length} site{filteredSites.length !== 1 ? 's' : ''} matching "{searchSite}"
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Date From *</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  min={selectedSite ? (() => {
                    const s = sites.find(site => site.id === selectedSite);
                    return s?.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : undefined;
                  })() : undefined}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={!selectedSite}
                />
                {selectedSite && dateFrom && (
                  <p className="text-xs text-gray-500">
                    Set to site's creation date: {new Date(dateFrom).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">Date To *</Label>
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
                    Must be on or after {new Date(dateFrom).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleApplyFilters} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Preview Report'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Report Preview */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Report Preview</h3>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Site ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Site Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Workers Assigned</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Progress</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Site Manager</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Total Time</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length > 0 ? (
                      reportData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{row.siteId}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium">{row.siteName}</td>
                          <td className="px-4 py-3 text-gray-600">{row.workersAssigned}</td>
                          <td className="px-4 py-3 text-gray-600">{row.progress}%</td>
                          <td className="px-4 py-3 text-gray-600">{row.siteManager}</td>
                          <td className="px-4 py-3 text-gray-600">{row.totalTime}</td>
                          <td className="px-4 py-3 text-gray-600">{row.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No data available for the selected filters
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
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('filters')} disabled={isLoading}>
                Back to Filters
              </Button>
              <Button onClick={handleExport} disabled={isLoading || reportData.length === 0}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
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
