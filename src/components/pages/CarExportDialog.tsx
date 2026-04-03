import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Download, Loader, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Car {
  id: string;
  name: string;
  number: string;
  color: string;
  model: string;
  status: string;
  createdAt: string;
}

interface CarReport {
  id: string;
  carId: string;
  carName: string;
  plateNumber: string;
  carNumber: string;
  carColor: string;
  carStatus: string;
}

interface CarExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cars: Car[];
}

export function CarExportDialog({ isOpen, onClose, cars }: CarExportDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'filters' | 'preview'>('filters');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<CarReport[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [selectedCar, setSelectedCar] = useState('');
  const [searchCar, setSearchCar] = useState('');
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

  const filteredCars = cars.filter(c => {
    if (!searchCar.trim()) return true;
    
    const searchTerm = searchCar.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(searchTerm) ||
      c.number.toLowerCase().includes(searchTerm) ||
      c.model.toLowerCase().includes(searchTerm) ||
      c.color.toLowerCase().includes(searchTerm)
    );
  });

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchCar(value);
    if (value.trim()) {
      setIsDropdownOpen(true);
    }
  };

  // Handle car selection and set default date from
  const handleCarSelect = (carId: string) => {
    setSelectedCar(carId);
    setIsDropdownOpen(false);
    
    // Find the selected car and set date from to their creation date
    const selectedCarData = cars.find(c => c.id === carId);
    if (selectedCarData) {
      const creationDate = new Date(selectedCarData.createdAt).toISOString().split('T')[0];
      setDateFrom(creationDate);
      
      // Reset date to when car changes
      setDateTo('');
      
      // Clear search after selection for better UX
      setSearchCar('');
    }
  };

  // Handle date from change and validate date to
  const handleDateFromChange = (newDateFrom: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if the selected date is in the future
    if (newDateFrom > today) {
      toast.error(t('cars.exportDateFromFuture'));
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
      toast.error(t('cars.exportDateToFuture'));
      return;
    }
    
    if (dateFrom && new Date(newDateTo) < new Date(dateFrom)) {
      toast.error(t('cars.exportDateToAfterFrom'));
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
      if (!selectedCar) {
        toast.error(t('cars.exportSelectCarRequired'));
        return;
      }

      if (!dateFrom || !dateTo) {
        toast.error(t('cars.exportSelectDatesRequired'));
        return;
      }

      if (new Date(dateFrom) > new Date(dateTo)) {
        toast.error(t('cars.exportDateFromBeforeTo'));
        return;
      }

      // Check if date to is in the future
      const today = new Date().toISOString().split('T')[0];
      if (dateTo > today) {
        toast.error(t('cars.exportDateToFuture'));
        return;
      }

      setIsLoading(true);

      // Fetch report data from API
      const response = await fetch('/api/cars/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId: selectedCar,
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
      toast.success(t('cars.exportGenerateSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('cars.exportGenerateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Additional validation before export
      const today = new Date().toISOString().split('T')[0];
      if (dateTo > today || dateFrom > today) {
        toast.error(t('cars.exportNoFutureDates'));
        return;
      }

      setIsLoading(true);

      // Call export API
      const response = await fetch('/api/cars/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId: selectedCar,
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
      a.download = `car-report-${selectedCar}.${exportFormat === 'pdf' ? 'pdf' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('cars.exportSuccess', { format: exportFormat.toUpperCase() }));
      onClose();
      resetFilters();
    } catch (error: any) {
      toast.error(error.message || t('cars.exportFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedCar('');
    setSearchCar('');
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
          <DialogTitle>{t('cars.exportReportTitle')}</DialogTitle>
        </DialogHeader>

        {step === 'filters' ? (
          <div className="space-y-[50px] py-4 overflow-y-auto flex-1">
            {/* Car Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('cars.exportSelectCar')}</Label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <Input
                    ref={searchInputRef}
                    placeholder={t('cars.exportSearchPlaceholder')}
                    value={searchCar}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="pl-10 pr-8"
                  />
                  {searchCar && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchCar('');
                        setIsDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Selected Car Display */}
                {selectedCar && !searchCar && (
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
                          {cars.find(c => c.id === selectedCar)?.name}
                        </p>
                        <p className="text-sm text-blue-700">
                          {cars.find(c => c.id === selectedCar)?.number} • {cars.find(c => c.id === selectedCar)?.model}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                )}

                {/* Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCars.length > 0 ? (
                      filteredCars.map(car => (
                        <div
                          key={car.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                            selectedCar === car.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => handleCarSelect(car.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{car.name}</p>
                              <p className="text-sm text-gray-600">{car.number} • {car.model}</p>
                              <p className="text-xs text-gray-500">{car.color} • {car.status}</p>
                            </div>
                            {selectedCar === car.id && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        {searchCar ? t('cars.exportNoMatches') : t('cars.exportNoCars')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Search Results Info */}
              {searchCar && filteredCars.length > 0 && (
                <p className="text-xs text-gray-500">
                  {t('cars.exportShowingMatches', { count: filteredCars.length, search: searchCar })}
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('cars.exportDateFrom')}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={!selectedCar}
                />
                {selectedCar && dateFrom && (
                  <p className="text-xs text-gray-500">
                    {t('cars.exportSetToCreation', { date: new Date(dateFrom).toLocaleDateString() })}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('cars.exportDateTo')}</Label>
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
                    {t('cars.exportMustBeAfter', { date: new Date(dateFrom).toLocaleDateString() })}
                  </p>
                )}
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('cars.exportFormat')}</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">{t('cars.exportPdf')}</SelectItem>
                  <SelectItem value="excel">{t('cars.exportExcel')}</SelectItem>
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
                    {t('cars.exportGenerating')}
                  </>
                ) : t('cars.exportPreviewReport')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Report Preview */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('cars.exportReportPreview')}</h3>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('cars.carName')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('cars.exportPlateNumber')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('cars.model')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('cars.color')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('cars.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length > 0 ? (
                      reportData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium">{row.carName}</td>
                          <td className="px-4 py-3 text-gray-600 font-mono">{row.plateNumber}</td>
                          <td className="px-4 py-3 text-gray-600">{cars.find(c => c.id === selectedCar)?.model || 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-600">{row.carColor}</td>
                          <td className="px-4 py-3 text-gray-600">{row.carStatus}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          {t('cars.exportNoData')}
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
                  <span className="font-semibold text-blue-900">{t('cars.exportSelectedCar')}</span>
                  <span className="ml-2 text-blue-800">
                    {cars.find(c => c.id === selectedCar)?.name || 'N/A'} ({cars.find(c => c.id === selectedCar)?.number || 'N/A'})
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-blue-900">{t('cars.exportDateRange')}</span>
                  <span className="ml-2 text-blue-800">
                    {dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}` : t('cars.exportNotSelected')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-blue-900">{t('cars.exportReportWillInclude')}</span>
                  <span className="ml-2 text-blue-800">
                    {t('cars.exportReportIncludes')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('filters')} disabled={isLoading}>
                {t('cars.exportBackToFilters')}
              </Button>
              <Button onClick={handleExport} disabled={isLoading || reportData.length === 0}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('cars.exportExporting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t('cars.exportAsFormat', { format: exportFormat.toUpperCase() })}
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
