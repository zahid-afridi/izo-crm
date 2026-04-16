"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FileSpreadsheet, Download, TrendingUp, DollarSign, Package, Users, Calendar, Filter, Loader, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

interface ReportsPageProps {
  userRole: string;
}

export function ReportsPage({ userRole }: ReportsPageProps) {
  const { t } = useTranslation();
  const [selectedReportType, setSelectedReportType] = useState('sales');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter states
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSiteStatus, setSelectedSiteStatus] = useState('all');
  const [selectedWorker, setSelectedWorker] = useState('all');
  const [selectedSite, setSelectedSite] = useState('all');
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Data states
  const [clients, setClients] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const canGenerateReports = ['admin', 'site_manager', 'order_manager', 'sales_agent'].includes(userRole);

  // Fetch filter data
  useEffect(() => {
    fetchFilterData();
  }, []);

  const fetchFilterData = async () => {
    try {
      const [clientsRes, categoriesRes, workersRes, sitesRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/categories/product-categories'),
        fetch('/api/workers'),
        fetch('/api/sites'),
      ]);

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.clients || []);
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }
      if (workersRes.ok) {
        const data = await workersRes.json();
        setWorkers(data.workers || []);
      }
      if (sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(data.sites || []);
      }
    } catch (err) {
      console.error('Error fetching filter data:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/reports/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateFrom, dateTo }),
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateFrom, dateTo]);

  const mockReportTypes = [
    { id: 'sales', icon: DollarSign, available: true },
    { id: 'products', icon: Package, available: true },
    { id: 'clients', icon: Users, available: true },
    { id: 'workers', icon: Users, available: true },
    { id: 'sites', icon: TrendingUp, available: true },
    { id: 'financial', icon: DollarSign, available: userRole === 'admin' },
  ];

  const handleGenerateReport = async () => {
    try {
      setError('');
      setIsLoading(true);

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: selectedReportType,
          dateFrom,
          dateTo,
          filters: {
            clientId: selectedClient !== 'all' ? selectedClient : null,
            categoryId: selectedCategory !== 'all' ? selectedCategory : null,
            siteStatus: selectedSiteStatus !== 'all' ? selectedSiteStatus : null,
            workerId: selectedWorker !== 'all' ? selectedWorker : null,
            siteId: selectedSite !== 'all' ? selectedSite : null,
          },
          format: exportFormat,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReportType}-report-${new Date().getTime()}.${exportFormat === 'pdf' ? 'pdf' : exportFormat === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('reports.reportGenerated', { format: exportFormat.toUpperCase() }));
    } catch (err: any) {
      const msg = err.message || t('reports.generateFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900">{t('reports.titleAnalytics')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('reports.subtitle')}</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('reports.totalSales')}</p>
          <p className="text-2xl font-semibold text-gray-900">€{stats?.totalSales?.toFixed(2) || '0.00'}</p>
          <p className="text-xs text-green-600 mt-1">{t('reports.ordersCount', { count: stats?.totalOrders || 0 })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('reports.totalOrders')}</p>
          <p className="text-2xl font-semibold text-gray-900">{stats?.totalOrders || 0}</p>
          <p className="text-xs text-brand-600 mt-1">{t('reports.approvedCount', { count: stats?.approvedOrders || 0 })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('reports.activeClients')}</p>
          <p className="text-2xl font-semibold text-gray-900">{stats?.activeClients || 0}</p>
          <p className="text-xs text-brand-600 mt-1">{t('reports.totalCount', { count: stats?.totalClients || 0 })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('reports.activeSites')}</p>
          <p className="text-2xl font-semibold text-gray-900">{stats?.activeSites || 0}</p>
          <p className="text-xs text-brand-600 mt-1">{t('reports.completedCount', { count: stats?.completedSites || 0 })}</p>
        </Card>
      </div>

      {/* Report Generation */}
      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">{t('reports.generate')}</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Report Type Selection */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">{t('reports.selectReportType')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockReportTypes.filter(r => r.available).map((report) => {
                const Icon = report.icon;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReportType(report.id)}
                    className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                      selectedReportType === report.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedReportType === report.id ? 'bg-brand-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          selectedReportType === report.id ? 'text-brand-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm text-gray-900 mb-1">{t(`reports.reportTypes.${report.id}.name`)}</h4>
                        <p className="text-xs text-gray-500">{t(`reports.reportTypes.${report.id}.description`)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Report Filters */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">{t('reports.reportFilters')}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{t('reports.dateFrom')}</Label>
                <Input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              
              <div>
                <Label>{t('reports.dateTo')}</Label>
                <Input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              
              <div>
                <Label>{t('reports.periodPreset')}</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={t('reports.selectPeriod')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">{t('reports.periodToday')}</SelectItem>
                    <SelectItem value="week">{t('reports.thisWeek')}</SelectItem>
                    <SelectItem value="month">{t('reports.thisMonth')}</SelectItem>
                    <SelectItem value="quarter">{t('reports.thisQuarter')}</SelectItem>
                    <SelectItem value="year">{t('reports.thisYear')}</SelectItem>
                    <SelectItem value="custom">{t('reports.customRange')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Filters based on report type */}
            {selectedReportType === 'sales' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>{t('reports.client')}</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('reports.allClientsPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('reports.allClients')}</SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('reports.productCategory')}</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('reports.allCategoriesPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('reports.allCategories')}</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedReportType === 'products' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>{t('reports.productCategory')}</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('reports.allCategoriesPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('reports.allCategories')}</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedReportType === 'clients' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>{t('reports.client')}</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('reports.allClientsPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('reports.allClients')}</SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedReportType === 'workers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>{t('reports.worker')}</Label>
                  <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('reports.allWorkersPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('reports.allWorkers')}</SelectItem>
                      {workers.map(worker => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedReportType === 'sites' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>{t('reports.siteStatus')}</Label>
                  <Select value={selectedSiteStatus} onValueChange={setSelectedSiteStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('reports.allSitesPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('reports.allSites')}</SelectItem>
                      <SelectItem value="pending">{t('reports.pending')}</SelectItem>
                      <SelectItem value="active">{t('reports.active')}</SelectItem>
                      <SelectItem value="closed">{t('reports.closed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('reports.site')}</Label>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('reports.allSitesPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('reports.allSites')}</SelectItem>
                      {sites.map(site => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </Card>

          {/* Export Options */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">{t('reports.exportFormat')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setExportFormat('pdf')}
                className={`h-auto py-4 flex flex-col items-center gap-2 border-2 rounded-lg transition-all ${
                  exportFormat === 'pdf'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={!canGenerateReports}
              >
                <FileSpreadsheet className="w-6 h-6" />
                <div>
                  <p className="text-sm font-medium">{t('reports.pdf')}</p>
                  <p className="text-xs opacity-70">{t('reports.printReady')}</p>
                </div>
              </button>
              
              <button
                onClick={() => setExportFormat('excel')}
                className={`h-auto py-4 flex flex-col items-center gap-2 border-2 rounded-lg transition-all ${
                  exportFormat === 'excel'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={!canGenerateReports}
              >
                <FileSpreadsheet className="w-6 h-6" />
                <div>
                  <p className="text-sm font-medium">{t('reports.excel')}</p>
                  <p className="text-xs opacity-70">{t('reports.editableSpreadsheet')}</p>
                </div>
              </button>
              
              <button
                onClick={() => setExportFormat('csv')}
                className={`h-auto py-4 flex flex-col items-center gap-2 border-2 rounded-lg transition-all ${
                  exportFormat === 'csv'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={!canGenerateReports}
              >
                <FileSpreadsheet className="w-6 h-6" />
                <div>
                  <p className="text-sm font-medium">{t('reports.csv')}</p>
                  <p className="text-xs opacity-70">{t('reports.commaSeparated')}</p>
                </div>
              </button>
            </div>
            
            {!canGenerateReports && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                {t('reports.noPermission')}
              </p>
            )}

            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleGenerateReport} 
                disabled={!canGenerateReports || isLoading}
                className="bg-brand-gradient hover:shadow-md text-white"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('reports.generating')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t('reports.generateDownload')}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}