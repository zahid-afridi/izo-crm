'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Download, 
  Calendar, 
  Users, 
  Building2, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppSelector } from '@/store/hooks';
import { selectSettingsForShell } from '@/store/selectors/settingsSelectors';

interface Worker {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  worker?: {
    hourlyRate?: number;
    monthlyRate?: number;
  };
}

interface Site {
  id: string;
  name: string;
  address: string;
  city?: string;
  status: string;
  client?: string;
  createdAt: string;
}

interface WorkerReport {
  workerId: string;
  workerName: string;
  totalWorkDays: number;
  dailySalary: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  workDates: string[];
  sites: string[];
}

interface SiteReport {
  siteId: string;
  siteName: string;
  totalWorkers: number;
  totalWorkDays: number;
  workDates: string[];
  workers: {
    workerId: string;
    workerName: string;
    workDays: number;
  }[];
}

export function SiteManagerReports() {
  const shell = useAppSelector(selectSettingsForShell);
  const companyTitle = shell.companyDisplayName?.trim() || 'IzoGrup';
  const companyTagline = shell.tagline?.trim() || 'Construction mangement system';
  const [activeTab, setActiveTab] = useState('worker-reports');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Selected filters
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  
  // Report data
  const [workerReports, setWorkerReports] = useState<WorkerReport[]>([]);
  const [siteReports, setSiteReports] = useState<SiteReport[]>([]);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  
  // Dialog states
  const [isWorkerReportDialogOpen, setIsWorkerReportDialogOpen] = useState(false);
  const [isPrintReportDialogOpen, setIsPrintReportDialogOpen] = useState(false);
  const [selectedWorkerReport, setSelectedWorkerReport] = useState<WorkerReport | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [workersRes, sitesRes] = await Promise.all([
        fetch('/api/workers'),
        fetch('/api/sites'),
      ]);

      if (!workersRes.ok || !sitesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const workersData = await workersRes.json();
      const sitesData = await sitesRes.json();

      setWorkers(workersData.workers || []);
      setSites(sitesData.sites || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateWorkerReports = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (selectedWorker) params.append('workerId', selectedWorker);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        params.append('month', month);
        params.append('year', year);
      }

      const response = await fetch(`/api/reports/worker-attendance?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate worker reports');
      }

      const data = await response.json();
      setWorkerReports(data.reports || []);
      toast.success('Worker reports generated successfully');
    } catch (error) {
      console.error('Error generating worker reports:', error);
      toast.error('Failed to generate worker reports');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSiteReports = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (selectedSite) params.append('siteId', selectedSite);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`/api/reports/site-attendance?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate site reports');
      }

      const data = await response.json();
      setSiteReports(data.reports || []);
      toast.success('Site reports generated successfully');
    } catch (error) {
      console.error('Error generating site reports:', error);
      toast.error('Failed to generate site reports');
    } finally {
      setIsLoading(false);
    }
  };

  const generateDailyReports = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`/api/reports/daily-attendance?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate daily reports');
      }

      const data = await response.json();
      setDailyReports(data.reports || []);
      toast.success('Daily reports generated successfully');
    } catch (error) {
      console.error('Error generating daily reports:', error);
      toast.error('Failed to generate daily reports');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePrintableReport = async (workerId: string) => {
    try {
      setIsLoading(true);
      const [year, month] = selectedMonth.split('-');
      
      const response = await fetch('/api/reports/worker-salary-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId,
          month: parseInt(month),
          year: parseInt(year),
          format: 'pdf'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate printable report');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salary-report-${selectedMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Printable report generated successfully');
    } catch (error) {
      console.error('Error generating printable report:', error);
      toast.error('Failed to generate printable report');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkers = workers.filter(worker =>
    worker.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Manager Reports</h1>
          <p className="text-gray-600">Generate comprehensive reports for workers, sites, and attendance</p>
        </div>
      </div>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="worker-reports">Worker Reports</TabsTrigger>
          <TabsTrigger value="site-reports">Site Reports</TabsTrigger>
          <TabsTrigger value="daily-reports">Daily Reports</TabsTrigger>
          <TabsTrigger value="salary-reports">Salary Reports</TabsTrigger>
        </TabsList>

        {/* Worker Reports Tab */}
        <TabsContent value="worker-reports" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Worker Attendance Reports</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label>Select Worker (Optional)</Label>
                <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                  <SelectTrigger>
                    <SelectValue placeholder="All workers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All workers</SelectItem>
                    {filteredWorkers.map(worker => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              
              <div className="flex items-end">
                <Button onClick={generateWorkerReports} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>

            {workerReports.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Worker Attendance Summary</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker Name</TableHead>
                      <TableHead>Total Work Days</TableHead>
                      <TableHead>Sites Worked</TableHead>
                      <TableHead>Work Dates</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workerReports.map((report) => (
                      <TableRow key={report.workerId}>
                        <TableCell className="font-medium">{report.workerName}</TableCell>
                        <TableCell>{report.totalWorkDays}</TableCell>
                        <TableCell>{report.sites.length}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {report.workDates.length} days
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedWorkerReport(report);
                              setIsWorkerReportDialogOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Site Reports Tab */}
        <TabsContent value="site-reports" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Site Attendance Reports</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label>Select Site (Optional)</Label>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All sites</SelectItem>
                    {filteredSites.map(site => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              
              <div className="flex items-end">
                <Button onClick={generateSiteReports} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>

            {siteReports.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Site Attendance Summary</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site Name</TableHead>
                      <TableHead>Total Workers</TableHead>
                      <TableHead>Total Work Days</TableHead>
                      <TableHead>Work Dates</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteReports.map((report) => (
                      <TableRow key={report.siteId}>
                        <TableCell className="font-medium">{report.siteName}</TableCell>
                        <TableCell>{report.totalWorkers}</TableCell>
                        <TableCell>{report.totalWorkDays}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {report.workDates.length} days
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Daily Reports Tab */}
        <TabsContent value="daily-reports" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Attendance Reports</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              
              <div className="flex items-end">
                <Button onClick={generateDailyReports} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>

            {dailyReports.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Daily Attendance Summary</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Workers</TableHead>
                      <TableHead>Total Sites</TableHead>
                      <TableHead>Attendance Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyReports.map((report, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{report.date}</TableCell>
                        <TableCell>{report.totalWorkers}</TableCell>
                        <TableCell>{report.totalSites}</TableCell>
                        <TableCell>
                          <Badge variant={report.attendanceRate > 80 ? 'default' : 'secondary'}>
                            {report.attendanceRate}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Export
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Salary Reports Tab */}
        <TabsContent value="salary-reports" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Salary Reports</h3>
            <p className="text-sm text-gray-600 mb-4">
              Generate professional salary reports with {companyTitle} branding for printing and official use.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label>Select Month</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Select Worker</Label>
                <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredWorkers.map(worker => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={() => selectedWorker && generatePrintableReport(selectedWorker)} 
                  disabled={isLoading || !selectedWorker}
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generate PDF Report
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Report Format</h4>
              <p className="text-sm text-blue-700 mb-2">
                The generated report will include:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• {companyTitle} logo and professional header</li>
                <li>• Report title: "{companyTagline} For [Month Year]"</li>
                <li>• Employee name and surname</li>
                <li>• Total work days for the month</li>
                <li>• Daily salary rate</li>
                <li>• Total amount (work days × daily salary)</li>
                <li>• Due amount (total - paid amount)</li>
              </ul>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Worker Report Details Dialog */}
      <Dialog open={isWorkerReportDialogOpen} onOpenChange={setIsWorkerReportDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Worker Report Details</DialogTitle>
          </DialogHeader>
          
          {selectedWorkerReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Worker Information</h4>
                  <p>Name: {selectedWorkerReport.workerName}</p>
                  <p>Total Work Days: {selectedWorkerReport.totalWorkDays}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Financial Summary</h4>
                  <p>Daily Salary: €{selectedWorkerReport.dailySalary}</p>
                  <p>Total Amount: €{selectedWorkerReport.totalAmount}</p>
                  <p>Due Amount: €{selectedWorkerReport.dueAmount}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Work Dates</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedWorkerReport.workDates.map((date, index) => (
                    <Badge key={index} variant="outline">
                      {new Date(date).toLocaleDateString()}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Sites Worked</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedWorkerReport.sites.map((site, index) => (
                    <Badge key={index} variant="secondary">
                      {site}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}