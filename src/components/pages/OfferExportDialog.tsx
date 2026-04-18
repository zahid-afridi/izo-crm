import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Download, Loader } from 'lucide-react';
import { toast } from 'sonner';

interface Offer {
  id: string;
  offerNumber: string;
  client: string;
  clientId?: string;
  title: string;
  offerDate: string;
  validUntil?: string | null;
  totalAmount: number;
  offerStatus: string;
  items: any[];
  currency: string;
  subtotal: number;
  discount: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  validityPeriod?: string;
  notes?: string;
  createdAt: string;
}

interface OfferReport {
  id: string;
  offerId: string;
  offerNumber: string;
  client: string;
  title: string;
  createdDate: string;
  validDate: string;
  status: string;
  totalAmount: number;
}

interface OfferExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offers: Offer[];
}

export function OfferExportDialog({ isOpen, onClose, offers }: OfferExportDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'filters' | 'preview'>('filters');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<OfferReport[]>([]);

  // Filter states
  const [selectedOffer, setSelectedOffer] = useState('');
  const [searchOffer, setSearchOffer] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf');

  const filteredOffers = offers.filter(o =>
    (o.offerNumber?.toLowerCase() || '').includes(searchOffer.toLowerCase()) ||
    (o.title?.toLowerCase() || '').includes(searchOffer.toLowerCase()) ||
    (o.client?.toLowerCase() || '').includes(searchOffer.toLowerCase())
  );

  // Handle offer selection and set default date from
  const handleOfferSelect = (offerId: string) => {
    setSelectedOffer(offerId);
    
    // Find the selected offer and set date from to their creation date
    const selectedOfferData = offers.find(o => o.id === offerId);
    if (selectedOfferData) {
      const creationDate = new Date(selectedOfferData.createdAt).toISOString().split('T')[0];
      setDateFrom(creationDate);
      
      // Reset date to when offer changes
      setDateTo('');
    }
  };

  // Handle date from change and validate date to
  const handleDateFromChange = (newDateFrom: string) => {
    setDateFrom(newDateFrom);
    
    // If date to is set and is before or equal to new date from, reset it
    if (dateTo && new Date(dateTo) <= new Date(newDateFrom)) {
      setDateTo('');
    }
  };

  // Handle date to change with validation
  const handleDateToChange = (newDateTo: string) => {
    if (dateFrom && new Date(newDateTo) <= new Date(dateFrom)) {
      toast.error(t('offers.exportDateToAfterFrom'));
      return;
    }
    setDateTo(newDateTo);
  };

  const handleApplyFilters = async () => {
    try {
      // Validate filters
      if (!selectedOffer) {
        toast.error(t('offers.exportSelectOfferRequired'));
        return;
      }

      if (!dateFrom || !dateTo) {
        toast.error(t('offers.exportSelectDatesRequired'));
        return;
      }

      if (new Date(dateFrom) > new Date(dateTo)) {
        toast.error(t('offers.exportDateFromBeforeTo'));
        return;
      }

      setIsLoading(true);

      // Fetch report data from API
      const response = await fetch('/api/offers/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: selectedOffer,
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
      toast.success(t('offers.exportGenerateSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('offers.exportGenerateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsLoading(true);

      // Call export API
      const response = await fetch('/api/offers/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: selectedOffer,
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
      a.download = `offer-report-${selectedOffer}.${exportFormat === 'pdf' ? 'pdf' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('offers.exportSuccess', { format: exportFormat.toUpperCase() }));
      onClose();
      resetFilters();
    } catch (error: any) {
      toast.error(error.message || t('offers.exportFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedOffer('');
    setSearchOffer('');
    setDateFrom('');
    setDateTo('');
    setExportFormat('pdf');
    setStep('filters');
    setReportData([]);
  };

  const handleClose = () => {
    resetFilters();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('offers.exportReportTitle')}</DialogTitle>
        </DialogHeader>

        {step === 'filters' ? (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Offer Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('offers.exportSelectOffer')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('offers.exportSearchPlaceholder')}
                  value={searchOffer}
                  onChange={(e) => setSearchOffer(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedOffer} onValueChange={handleOfferSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={t('offers.exportSelectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredOffers.map(offer => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.offerNumber} - {offer.title} ({offer.client})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('offers.exportDateFrom')}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  disabled={!selectedOffer}
                />
                {selectedOffer && dateFrom && (
                  <p className="text-xs text-gray-500">
                    {t('offers.exportSetToCreation', { date: new Date(dateFrom).toLocaleDateString() })}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">{t('offers.exportDateTo')}</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  min={dateFrom ? new Date(new Date(dateFrom).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined}
                  disabled={!dateFrom}
                />
                {dateFrom && (
                  <p className="text-xs text-gray-500">
                    {t('offers.exportMustBeAfter', { date: new Date(dateFrom).toLocaleDateString() })}
                  </p>
                )}
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('offers.exportFormat')}</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">{t('offers.exportPdf')}</SelectItem>
                  <SelectItem value="excel">{t('offers.exportExcel')}</SelectItem>
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
                    {t('offers.exportGenerating')}
                  </>
                ) : t('offers.exportPreviewReport')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Report Preview */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('offers.exportReportPreview')}</h3>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('offers.offerNumber')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('offers.client')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('offers.title')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('offers.exportCreatedDate')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('offers.status')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('offers.totalAmount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length > 0 ? (
                      reportData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium">{row.offerNumber}</td>
                          <td className="px-4 py-3 text-gray-600">{row.client}</td>
                          <td className="px-4 py-3 text-gray-600">{row.title}</td>
                          <td className="px-4 py-3 text-gray-600">{row.createdDate}</td>
                          <td className="px-4 py-3 text-gray-600">{row.status}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium">€{row.totalAmount.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          {t('offers.exportNoData')}
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
                <span className="font-semibold">{t('offers.exportTotalRecords')}</span> {reportData.length}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('filters')} disabled={isLoading}>
                {t('offers.exportBackToFilters')}
              </Button>
              <Button onClick={handleExport} disabled={isLoading || reportData.length === 0}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('offers.exportExporting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t('offers.exportAsFormat', { format: exportFormat.toUpperCase() })}
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
