import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Download, Loader } from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: string;
  createdAt: string;
}

interface ClientReport {
  id: string;
  clientId: string;
  clientName: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  createdDate: string;
  totalOrders: number;
  totalRevenue: number;
  // New required fields
  vatNumber: string;
  clientType: string;
  clientStatus: string;
  phoneNumber: string;
  emailAddress: string;
  createdBy: string;
  assignedSalesAgent: string;
  creationDate: string;
  totalOrdersCount: number;
  totalRevenueGenerated: number;
}

interface ClientExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
}

export function ClientExportDialog({ isOpen, onClose, clients }: ClientExportDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'filters' | 'preview'>('filters');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ClientReport[]>([]);

  // Filter states
  const [selectedClient, setSelectedClient] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exportFormat, setExportFormat] = useState('pdf');

  const filteredClients = clients.filter(c =>
    (c.fullName?.toLowerCase() || '').includes(searchClient.toLowerCase()) ||
    (c.email?.toLowerCase() || '').includes(searchClient.toLowerCase())
  );

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
      setIsLoading(true);

      // Fetch report data from API
      const response = await fetch('/api/clients/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient || null,
          status: statusFilter !== 'all' ? statusFilter : null,
          format: exportFormat,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReportData(data.report || []);
      setStep('preview');
      toast.success(t('clients.exportReportGenerated'));
    } catch (error: any) {
      toast.error(error.message || t('clients.exportReportFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsLoading(true);

      // Call export API
      const response = await fetch('/api/clients/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient || null,
          status: statusFilter !== 'all' ? statusFilter : null,
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
      a.download = `client-report-${new Date().getTime()}.${exportFormat === 'pdf' ? 'pdf' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('clients.exportReportExported', { format: exportFormat.toUpperCase() }));
      onClose();
      resetFilters();
    } catch (error: any) {
      toast.error(error.message || t('clients.exportExportFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedClient('');
    setSearchClient('');
    setStatusFilter('all');
    setExportFormat('pdf');
    setStep('filters');
    setReportData([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-7xl w-[98vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('clients.exportModalTitle')}</DialogTitle>
        </DialogHeader>

        {step === 'filters' ? (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Client Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('clients.exportSelectClient')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('clients.exportSearchPlaceholder')}
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder={t('clients.exportSelectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.fullName} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('clients.exportClientStatus')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('clients.allStatus')}</SelectItem>
                  <SelectItem value="active">{t('clients.active')}</SelectItem>
                  <SelectItem value="inactive">{t('clients.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{t('clients.exportFormat')}</Label>
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
                {t('common.cancel')}
              </Button>
              <Button onClick={handleApplyFilters} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('clients.exportGenerating')}
                  </>
                ) : (
                  t('clients.exportPreviewReport')
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {/* Report Preview */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{t('clients.exportReportPreview')}</h3>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('clients.exportClientId')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('clients.exportClientName')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('clients.email')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('clients.phone')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('clients.address')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('clients.status')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('clients.exportCreatedDate')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('clients.exportTotalOrders')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('clients.exportTotalRevenueCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length > 0 ? (
                      reportData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{row.clientId}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium">{row.clientName}</td>
                          <td className="px-4 py-3 text-gray-600">{row.email}</td>
                          <td className="px-4 py-3 text-gray-600">{row.phone || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{row.address || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {row.status === 'active' ? t('clients.active') : row.status === 'inactive' ? t('clients.inactive') : row.status}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{row.createdDate}</td>
                          <td className="px-4 py-3 text-gray-600">{row.totalOrders}</td>
                          <td className="px-4 py-3 text-gray-600 font-medium">${row.totalRevenue.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                          {t('clients.exportNoDataAvailable')}
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
                <span className="font-semibold">{t('clients.exportTotalRecords')}:</span> {reportData.length}
              </p>
              {reportData.length > 0 && (
                <p className="text-sm text-blue-900 mt-2">
                  <span className="font-semibold">{t('clients.exportTotalRevenue')}:</span> ${reportData.reduce((sum, r) => sum + r.totalRevenue, 0).toFixed(2)}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('filters')} disabled={isLoading}>
                {t('clients.exportBackToFilters')}
              </Button>
              <Button onClick={handleExport} disabled={isLoading || reportData.length === 0}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('clients.exportExporting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t('clients.exportExportAs', { format: exportFormat.toUpperCase() })}
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
