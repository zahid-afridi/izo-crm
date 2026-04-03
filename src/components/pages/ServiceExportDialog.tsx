'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Loader, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  title: string;
  price?: number;
  category?: { name: string };
  subcategory?: {
    category?: {
      name: string;
    };
  };
}

interface ServiceReport {
  id: string;
  title: string;
  category: string;
  price: number;
  duration: string;
  status: string;
  publishedOnWebsite: string;
  createdAt: string;
}

interface ServiceExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
}

export function ServiceExportDialog({ isOpen, onClose, services }: ServiceExportDialogProps) {
  const [step, setStep] = useState<'filters' | 'preview'>('filters');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ServiceReport[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
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

  // Get unique categories from services
  const categories = Array.from(
    new Set(services.map(s => s.category?.name ?? s.subcategory?.category?.name).filter(Boolean))
  ).map(name => ({ id: name, name }));

  const filteredCategories = categories.filter(c =>
    c.name && c.name.toLowerCase().includes(searchCategory.toLowerCase())
  );

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchCategory(value);
    if (value.trim()) {
      setIsDropdownOpen(true);
    }
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsDropdownOpen(false);
    
    // Clear search after selection for better UX
    setSearchCategory('');
  };

  const handleApplyFilters = async () => {
    try {
      setIsLoading(true);

      // Fetch report data from API
      const response = await fetch('/api/services/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory === 'all' || !selectedCategory ? 'all' : selectedCategory,
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

      // Call export API with retry mechanism
      let response;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          response = await fetch('/api/services/export-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              categoryId: selectedCategory === 'all' || !selectedCategory ? 'all' : selectedCategory,
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
        throw new Error(errorData?.details || errorData?.error || 'Failed to export report');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `services-report-${Date.now()}.${exportFormat === 'pdf' ? 'pdf' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Report exported as ${exportFormat.toUpperCase()}`);
      onClose();
      resetFilters();
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export report');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedCategory('');
    setSearchCategory('');
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
          <DialogTitle>Export Services Catalog Report</DialogTitle>
        </DialogHeader>

        {step === 'filters' ? (
          <div className="space-y-[50px] py-4 overflow-y-auto flex-1">
            {/* Category Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select Category</Label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search category or select 'All Categories'..."
                    value={searchCategory}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="pl-10 pr-8"
                  />
                  {searchCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchCategory('');
                        setIsDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Selected Category Display */}
                {selectedCategory && !searchCategory && (
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
                          {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                        </p>
                        <p className="text-sm text-blue-700">
                          {selectedCategory === 'all' 
                            ? `${services.length} total services` 
                            : `${services.filter(s => (s.category?.name ?? s.subcategory?.category?.name) === selectedCategory).length} services in this category`
                          }
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                )}

                {/* Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {/* All Categories Option */}
                    <div
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 ${
                        selectedCategory === 'all' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                      onClick={() => handleCategorySelect('all')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">All Categories</p>
                          <p className="text-sm text-gray-600">{services.length} total services</p>
                        </div>
                        {selectedCategory === 'all' && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                    </div>

                    {/* Category Options */}
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map(category => (
                        <div
                          key={category.id || category.name}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                            selectedCategory === category.name ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => handleCategorySelect(category.name || '')}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{category.name}</p>
                              <p className="text-sm text-gray-600">
                                {services.filter(s => (s.category?.name ?? s.subcategory?.category?.name) === category.name).length} services
                              </p>
                            </div>
                            {selectedCategory === category.name && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                      ))
                    ) : searchCategory ? (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        No categories found matching "{searchCategory}"
                      </div>
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        No categories available
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Search Results Info */}
              {searchCategory && filteredCategories.length > 0 && (
                <p className="text-xs text-gray-500">
                  Showing {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'} matching "{searchCategory}"
                </p>
              )}
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
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Title</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Category</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Price</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Published</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length > 0 ? (
                      reportData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium">{row.title}</td>
                          <td className="px-4 py-3 text-gray-600">{row.category}</td>
                          <td className="px-4 py-3 text-gray-600">${row.price}</td>
                          <td className="px-4 py-3 text-gray-600">{row.publishedOnWebsite}</td>
                          <td className="px-4 py-3 text-gray-600">{row.createdAt}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
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