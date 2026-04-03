'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Loader, ChevronDown, Check, Settings } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface Product {
  id: string;
  title: string;
  sku?: string;
  upc?: string;
  price?: number;
  subcategory?: {
    category?: {
      name: string;
    };
  };
}

interface ProductReport {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  sku?: string;
  upc?: string;
  price?: number;
  stock?: number;
  status?: string;
  publishedOnWebsite?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export function ProductExportDialog({ isOpen, onClose, products }: ProductExportDialogProps) {
  const [step, setStep] = useState<'filters' | 'columns' | 'preview'>('filters');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ProductReport[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [exportFormat, setExportFormat] = useState('pdf');

  // Column selection states
  const [selectedColumns, setSelectedColumns] = useState({
    title: true,
    description: false,
    category: true,
    sku: true,
    upc: false,
    price: true,
    stock: true,
    status: true,
    images: false,
    publishedOnWebsite: false,
    createdAt: false,
    updatedAt: false,
  });

  // Available columns configuration
  const availableColumns = [
    { key: 'title', label: 'Product Name', required: true },
    { key: 'description', label: 'Description', required: false },
    { key: 'category', label: 'Category', required: false },
    { key: 'sku', label: 'SKU', required: false },
    { key: 'upc', label: 'UPC', required: false },
    { key: 'price', label: 'Price', required: false },
    { key: 'stock', label: 'Stock Quantity', required: false },
    { key: 'status', label: 'Status', required: false },
    // { key: 'images', label: 'Product Images', required: false },
    { key: 'publishedOnWebsite', label: 'Published on Website', required: false },
    { key: 'createdAt', label: 'Created Date', required: false },
    { key: 'updatedAt', label: 'Last Updated', required: false },
  ];

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

  // Get unique categories from products
  const categories = Array.from(
    new Set(products.map(p => p.subcategory?.category?.name).filter(Boolean))
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
    setError(null); // Clear errors when user changes filters
    
    // Clear search after selection for better UX
    setSearchCategory('');
  };

  // Handle column selection
  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey as keyof typeof prev]
    }));
  };

  // Handle select all columns
  const handleSelectAllColumns = () => {
    const allSelected = Object.values(selectedColumns).every(Boolean);
    const newState = availableColumns.reduce((acc, col) => ({
      ...acc,
      [col.key]: !allSelected
    }), {} as typeof selectedColumns);
    setSelectedColumns(newState);
  };

  // Get selected column count
  const selectedColumnCount = Object.values(selectedColumns).filter(Boolean).length;

  const handleApplyFilters = () => {
    setError(null); // Clear any errors when moving to next step
    // Move to column selection step
    setStep('columns');
  };

  const handleGeneratePreview = async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors

      // Fetch report data from API
      const response = await fetch('/api/products/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory === 'all' || !selectedCategory ? 'all' : selectedCategory,
          status: selectedStatus,
          format: exportFormat,
          columns: selectedColumns,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData?.message || errorData?.error || 'Failed to generate report');
      }

      const data = await response.json();
      const reportData = data.report || [];

      if (reportData.length === 0) {
        setError('No data found for the selected filters. Please adjust your filters and try again.');
        return;
      }

      setReportData(reportData);
      setStep('preview');
      toast.success('Report generated successfully');
    } catch (error: any) {
      console.error('Generate preview error:', error);
      setError(error.message || 'Failed to generate report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (reportData.length === 0) {
      setError('No data available to export. Please adjust your filters.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors

      // Call export API with retry mechanism
      let response;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          response = await fetch('/api/products/export-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              categoryId: selectedCategory === 'all' || !selectedCategory ? 'all' : selectedCategory,
              status: selectedStatus,
              format: exportFormat,
              columns: selectedColumns,
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
        throw new Error(errorData?.details || errorData?.message || errorData?.error || 'Failed to export report');
      }

      // Download file
      const blob = await response.blob();
      console.log('Blob details:', {
        size: blob.size,
        type: blob.type,
        format: exportFormat
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set correct file extension based on format
      const fileExtension = exportFormat === 'pdf' ? 'pdf' : 'csv';
      a.download = `products-catalog-report.${fileExtension}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Catalog exported successfully as ${exportFormat.toUpperCase()}`);
      onClose();
      resetFilters();
    } catch (error: any) {
      console.error('Export error:', error);
      setError(error.message || 'Failed to export catalog. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedCategory('');
    setSearchCategory('');
    setSelectedStatus('all');
    setExportFormat('pdf');
    setSelectedColumns({
      title: true,
      description: false,
      category: true,
      sku: true,
      upc: false,
      price: true,
      stock: true,
      status: true,
      images: false,
      publishedOnWebsite: false,
      createdAt: false,
      updatedAt: false,
    });
    setStep('filters');
    setReportData([]);
    setIsDropdownOpen(false);
    setError(null); // Clear any errors
  };

  const handleClose = () => {
    resetFilters();
    onClose();
  };

  // Truncate long text for preview - title: 40 chars, description: 60 chars
  const truncatePreview = (text: string | undefined, maxLen: number): string => {
    if (!text || typeof text !== 'string') return '-';
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-[90rem] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Export Products Catalog Report
            {step === 'filters' && ' - Step 1: Filters'}
            {step === 'columns' && ' - Step 2: Select Columns'}
            {step === 'preview' && ' - Step 3: Preview & Export'}
          </DialogTitle>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className={`flex items-center ${step === 'filters' ? 'text-blue-600' : step === 'columns' || step === 'preview' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'filters' ? 'bg-blue-100 text-blue-600' : 
                step === 'columns' || step === 'preview' ? 'bg-green-100 text-green-600' : 
                'bg-gray-100 text-gray-400'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Filters</span>
            </div>
            
            <div className={`w-8 h-0.5 ${step === 'columns' || step === 'preview' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center ${step === 'columns' ? 'text-blue-600' : step === 'preview' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'columns' ? 'bg-blue-100 text-blue-600' : 
                step === 'preview' ? 'bg-green-100 text-green-600' : 
                'bg-gray-100 text-gray-400'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Columns</span>
            </div>
            
            <div className={`w-8 h-0.5 ${step === 'preview' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center ${step === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'preview' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Preview</span>
            </div>
          </div>
        </DialogHeader>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 text-red-500 mt-0.5">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 mb-1">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

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
                            ? `${products.length} total products` 
                            : `${products.filter(p => p.subcategory?.category?.name === selectedCategory).length} products in this category`
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
                          <p className="text-sm text-gray-600">{products.length} total products</p>
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
                                {products.filter(p => p.subcategory?.category?.name === category.name).length} products
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

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Status Filter</Label>
              <Select value={selectedStatus} onValueChange={(value) => {
                setSelectedStatus(value);
                setError(null); // Clear errors when user changes filters
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Format */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Export Format</Label>
              <Select value={exportFormat} onValueChange={(value) => {
                setExportFormat(value);
                setError(null); // Clear errors when user changes format
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF - Professional Catalog</SelectItem>
                  <SelectItem value="excel">Excel - Data Spreadsheet</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Format Features */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                {exportFormat === 'pdf' ? (
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">PDF Features:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Professional catalog layout with company branding</li>
                      <li>• Product images included (when Images column selected)</li>
                      <li>• Executive summary with key metrics</li>
                      <li>• Enhanced visual presentation</li>
                      <li>• Perfect for client presentations and marketing</li>
                    </ul>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Excel Features:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Complete data export with all selected columns</li>
                      <li>• Easy to import into other systems</li>
                      <li>• Suitable for data analysis and manipulation</li>
                      <li>• Includes summary statistics</li>
                      <li>• Perfect for inventory management</li>
                    </ul>
                  </div>
                )}
              </div>
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
                  <>
                    <Settings className="w-4 h-4 mr-2" />
                    Select Columns
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : step === 'columns' ? (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Column Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Select Columns to Include</h3>
                <div className="text-sm text-gray-500">
                  {selectedColumnCount} of {availableColumns.length} columns selected
                </div>
              </div>

              {/* Select All Toggle */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                <Checkbox
                  id="select-all"
                  checked={selectedColumnCount === availableColumns.length}
                  onCheckedChange={handleSelectAllColumns}
                />
                <Label htmlFor="select-all" className="font-medium cursor-pointer">
                  {selectedColumnCount === availableColumns.length ? 'Deselect All' : 'Select All'}
                </Label>
              </div>

              {/* Column Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableColumns.map((column) => (
                  <div
                    key={column.key}
                    className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedColumns[column.key as keyof typeof selectedColumns] 
                        ? 'border-blue-200 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <Checkbox
                      id={column.key}
                      checked={selectedColumns[column.key as keyof typeof selectedColumns]}
                      onCheckedChange={() => handleColumnToggle(column.key)}
                      disabled={column.required}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={column.key} 
                        className={`cursor-pointer font-medium ${
                          column.required ? 'text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {column.label}
                        {column.required && (
                          <span className="text-xs text-gray-400 ml-1">(Required)</span>
                        )}
                      </Label>
                      {column.key === 'description' && (
                        <p className="text-xs text-gray-500 mt-1">Product description text</p>
                      )}
                      {column.key === 'images' && (
                        <p className="text-xs text-gray-500 mt-1">Include product image URLs</p>
                      )}
                      {column.key === 'price' && (
                        <p className="text-xs text-gray-500 mt-1">Product pricing information</p>
                      )}
                      {column.key === 'publishedOnWebsite' && (
                        <p className="text-xs text-gray-500 mt-1">Website publication status</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Column Preview */}
              {selectedColumnCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Selected Columns Preview:</h4>
                  <div className="flex flex-wrap gap-2">
                    {availableColumns
                      .filter(col => selectedColumns[col.key as keyof typeof selectedColumns])
                      .map(col => (
                        <span
                          key={col.key}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                        >
                          {col.label}
                        </span>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setError(null);
                setStep('filters');
              }} disabled={isLoading}>
                Back to Filters
              </Button>
              <Button 
                onClick={handleGeneratePreview} 
                disabled={isLoading || selectedColumnCount === 0}
              >
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
          <div className="flex flex-col flex-1 min-h-0">
            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto py-4">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Report Preview</h3>
                <div className="border rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm table-fixed min-w-[600px]">
                  <thead className="bg-gray-50 border-b sticky top-0 z-10">
                    <tr>
                      {availableColumns
                        .filter(col => selectedColumns[col.key as keyof typeof selectedColumns])
                        .map(col => (
                          <th
                            key={col.key}
                            className={`px-4 py-3 text-left font-semibold text-gray-900 ${
                              col.key === 'title' ? 'w-[200px] min-w-[180px]' :
                              col.key === 'description' ? 'w-[250px] min-w-[200px]' :
                              col.key === 'category' ? 'w-[140px] min-w-[120px]' :
                              'min-w-[80px]'
                            }`}
                          >
                            {col.label}
                          </th>
                        ))
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length > 0 ? (
                      reportData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          {availableColumns
                            .filter(col => selectedColumns[col.key as keyof typeof selectedColumns])
                            .map(col => {
                              const value = row[col.key as keyof typeof row];
                              const displayValue = value !== undefined && value !== null && value !== '' ? String(value) : '-';
                              const fullValue = displayValue !== '-' ? displayValue : '';

                              if (col.key === 'title') {
                                const truncated = truncatePreview(displayValue !== '-' ? displayValue : '', 40);
                                return (
                                  <td key={col.key} className="px-4 py-3 text-gray-600 overflow-hidden" title={fullValue}>
                                    <span className="font-medium text-gray-900 truncate block" title={fullValue}>
                                      {truncated}
                                    </span>
                                  </td>
                                );
                              }
                              if (col.key === 'description') {
                                const truncated = truncatePreview(displayValue !== '-' ? displayValue : '', 60);
                                return (
                                  <td key={col.key} className="px-4 py-3 text-gray-600 overflow-hidden" title={fullValue}>
                                    <span className="truncate block" title={fullValue}>
                                      {truncated}
                                    </span>
                                  </td>
                                );
                              }
                              if (col.key === 'price' && value != null) {
                                return (
                                  <td key={col.key} className="px-4 py-3 text-gray-600">
                                    ${value}
                                  </td>
                                );
                              }
                              return (
                                <td key={col.key} className="px-4 py-3 text-gray-600 overflow-hidden">
                                  <span className="truncate block max-w-full" title={displayValue !== '-' ? displayValue : ''}>
                                    {displayValue}
                                  </span>
                                </td>
                              );
                            })
                          }
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={selectedColumnCount} className="px-4 py-8 text-center text-gray-500">
                          No data available for the selected filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </div>

            {/* Fixed bottom section */}
            <div className="flex-shrink-0 pt-4 mt-4 border-t bg-background">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Total Records:</span> {reportData.length}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setError(null);
                  setStep('columns');
                }} disabled={isLoading}>
                  Back to Columns
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}