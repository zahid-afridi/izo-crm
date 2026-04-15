import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAppSelector } from '@/store/hooks';
import { selectSettingsForShell } from '@/store/selectors/settingsSelectors';
import { 
  FileText,
  Download,
  Calendar,
  Users,
  Building2,
  DollarSign,
  Printer
} from 'lucide-react';

interface SiteReportsProps {
  userRole: string;
}

export function SiteReports({ userRole }: SiteReportsProps) {
  const shell = useAppSelector(selectSettingsForShell);
  const companyTitle = shell.companyDisplayName?.trim() || 'IzoGrup';
  const companyTagline = shell.tagline?.trim() || 'Construction mangement system';
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const mockWorkers = [
    { id: 1, name: 'John Doe', dailySalary: 50 },
    { id: 2, name: 'Jane Smith', dailySalary: 45 },
    { id: 3, name: 'Mike Johnson', dailySalary: 50 },
    { id: 4, name: 'Sarah Williams', dailySalary: 55 },
  ];

  const mockSites = [
    { id: 1, name: 'Villa Project - Tirana', createdDate: '2024-11-15', status: 'active' },
    { id: 2, name: 'Office Building - Durres', createdDate: '2025-01-10', status: 'active' },
    { id: 3, name: 'Residential Complex', createdDate: '2024-09-01', status: 'disabled' },
  ];

  const generateWorkerDailyReport = () => {
    const worker = mockWorkers.find(w => w.id.toString() === selectedWorker);
    if (!worker) {
      alert('Please select a worker');
      return;
    }
    alert(`Worker Daily Report\n\nWorker: ${worker.name}\nDate: ${selectedDate}\n\nStatus: Working at Villa Project - Tirana\n\nExporting to Excel...`);
  };

  const generateWorkerMonthlyReport = () => {
    const worker = mockWorkers.find(w => w.id.toString() === selectedWorker);
    if (!worker) {
      alert('Please select a worker');
      return;
    }
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    alert(`Worker Monthly Report\n\nWorker: ${worker.name}\nMonth: ${monthName}\n\nTotal Work Days: 22\nSites Worked: Villa Project, Office Building\nDays Off: 8\n\nExporting to Excel...`);
  };

  const generateSiteDateRangeReport = () => {
    const site = mockSites.find(s => s.id.toString() === selectedSite);
    if (!site) {
      alert('Please select a site');
      return;
    }
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    alert(`Site Date Range Report\n\nSite: ${site.name}\nFrom: ${startDate}\nTo: ${endDate}\nTotal Days: ${days}\n\nBreakdown:\n• Dec 5: 12 workers\n• Dec 6: 10 workers\n• Dec 7: 15 workers\n...\n\nAverage Workers/Day: 12.3\nTotal Worker Days: 270\n\nExporting to Excel...`);
  };

  const generateSiteMonthlyReport = () => {
    const site = mockSites.find(s => s.id.toString() === selectedSite);
    if (!site) {
      alert('Please select a site');
      return;
    }
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    alert(`Site Monthly Report\n\nSite: ${site.name}\nMonth: ${monthName}\n\nDaily Breakdown:\n• Dec 1: 12 workers\n• Dec 2: 10 workers\n• Dec 3: 15 workers\n...\n\nTotal Work Days: 22\nTotal Worker Days: 264\nAverage Workers/Day: 12\n\nExporting to Excel...`);
  };

  const generateSiteTotalReport = () => {
    const site = mockSites.find(s => s.id.toString() === selectedSite);
    if (!site) {
      alert('Please select a site');
      return;
    }
    const start = new Date(site.createdDate);
    const end = site.status === 'active' ? new Date() : new Date('2025-11-20');
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    alert(`Site Total Report\n\nSite: ${site.name}\nCreated: ${site.createdDate}\nStatus: ${site.status === 'active' ? 'Active' : 'Completed'}\n${site.status === 'disabled' ? 'Completed: 2025-11-20\n' : ''}\nTotal Days Active: ${totalDays}\n\nTotal Worker Days: 1,260\nTotal Work Days: 105\nAverage Workers/Day: 12\n\nExporting to Excel...`);
  };

  const generatePayrollReport = () => {
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const reportContent = `
╔════════════════════════════════════════════════╗
║            ${companyTitle.toUpperCase()} CRM LOGO                    ║
║                                                ║
║  ${companyTagline}       ║
║  For ${monthName}                         ║
╚════════════════════════════════════════════════╝

┌────────────────┬──────┬────────┬────────┬──────┬────────┐
│ Employee Name  │ Days │ Daily  │ Total  │ Paid │  Due   │
│                │      │ Salary │        │      │ Amount │
├────────────────┼──────┼────────┼────────┼──────┼────────┤
│ John Doe       │  22  │  €50   │ €1,100 │ €800 │  €300  │
│ Jane Smith     │  20  │  €45   │  €900  │ €900 │  €0    │
│ Mike Johnson   │  18  │  €50   │  €900  │ €500 │  €400  │
│ Sarah Williams │  22  │  €55   │ €1,210 │ €1,000│ €210  │
└────────────────┴──────┴────────┴────────┴──────┴────────┘

Total Employees: 4
Total Amount: €4,110
Total Paid: €3,200
Total Due: €910
    `;
    alert('Generating Professional Payroll Report...\n\nFormat: PDF with Logo & Template\n\nPreview:\n' + reportContent);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-gray-900">Reports & Analytics</h2>
        <p className="text-sm text-gray-500 mt-1">Generate detailed reports for workers, sites, and payroll</p>
      </div>

      <Tabs defaultValue="worker" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="worker">
            <Users className="w-4 h-4 mr-2" />
            Worker Reports
          </TabsTrigger>
          <TabsTrigger value="site">
            <Building2 className="w-4 h-4 mr-2" />
            Site Reports
          </TabsTrigger>
          <TabsTrigger value="payroll">
            <DollarSign className="w-4 h-4 mr-2" />
            Payroll Report
          </TabsTrigger>
        </TabsList>

        {/* Worker Reports Tab */}
        <TabsContent value="worker" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Worker Report */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-brand-600" />
                <h3 className="text-lg text-gray-900">Daily Worker Report</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Check if a specific worker was working on a specific date and which site
              </p>
              <div className="space-y-3">
                <div>
                  <Label>Select Worker</Label>
                  <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockWorkers.map(worker => (
                        <SelectItem key={worker.id} value={worker.id.toString()}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={generateWorkerDailyReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Daily Report
                </Button>
              </div>
            </Card>

            {/* Monthly Worker Report */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-green-600" />
                <h3 className="text-lg text-gray-900">Monthly Worker Report</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                View total work days, sites worked at, and days off for a specific month
              </p>
              <div className="space-y-3">
                <div>
                  <Label>Select Worker</Label>
                  <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockWorkers.map(worker => (
                        <SelectItem key={worker.id} value={worker.id.toString()}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select Month</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={generateWorkerMonthlyReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Monthly Report
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Site Reports Tab */}
        <TabsContent value="site" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Site Date Range Report */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-brand-600" />
                <h3 className="text-lg text-gray-900">Date Range Report</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Who was working, total workers, for each date in range
              </p>
              <div className="space-y-3">
                <div>
                  <Label>Select Site</Label>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose site" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockSites.map(site => (
                        <SelectItem key={site.id} value={site.id.toString()}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={generateSiteDateRangeReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Range Report
                </Button>
              </div>
            </Card>

            {/* Site Monthly Report */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg text-gray-900">Monthly Site Report</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Daily breakdown of workers for an entire month
              </p>
              <div className="space-y-3">
                <div>
                  <Label>Select Site</Label>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose site" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockSites.map(site => (
                        <SelectItem key={site.id} value={site.id.toString()}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select Month</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={generateSiteMonthlyReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Monthly Report
                </Button>
              </div>
            </Card>

            {/* Site Total Report */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-brand-600" />
                <h3 className="text-lg text-gray-900">Site Total Report</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Complete report from creation until completion (disabled)
              </p>
              <div className="space-y-3">
                <div>
                  <Label>Select Site</Label>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose site" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockSites.map(site => (
                        <SelectItem key={site.id} value={site.id.toString()}>
                          {site.name}
                          {site.status === 'disabled' && ' (Completed)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-600">
                  <p className="mb-1">Includes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Total days active</li>
                    <li>Total worker days</li>
                    <li>Average workers per day</li>
                    <li>Cost analysis</li>
                  </ul>
                </div>
                <Button className="w-full" onClick={generateSiteTotalReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Total Report
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Payroll Report Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-lg text-gray-900">Payroll Report</h3>
                <p className="text-sm text-gray-500">
                  Professional template: Employee name, total work days, daily salary, total, paid, due amount
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-brand-50 to-green-50 border border-brand-200 rounded-lg p-6 mb-6">
              <h4 className="text-sm text-gray-900 mb-4">Report Preview Header:</h4>
              <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-brand-gradient rounded-lg mx-auto flex items-center justify-center shadow-md">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl text-gray-900">{companyTitle}</h2>
                  <h3 className="text-gray-900">{companyTagline}</h3>
                  <p className="text-gray-600">For {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Select Month</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
                <h4 className="text-sm text-brand-700 mb-2">Report Includes:</h4>
                <ul className="space-y-1 text-xs text-brand-600">
                  <li>• <span className="font-medium">Employee Name & Surname</span></li>
                  <li>• <span className="font-medium">Total Work Days</span> (for the month)</li>
                  <li>• <span className="font-medium">Daily Salary</span> (€ per day)</li>
                  <li>• <span className="font-medium">Total</span> (Work Days × Daily Salary)</li>
                  <li>• <span className="font-medium">Paid</span> (Amount paid via bank - tracked internally)</li>
                  <li>• <span className="font-medium">Due Amount</span> (Total - Paid)</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={generatePayrollReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export to PDF
                </Button>
                <Button variant="outline" className="flex-1" onClick={generatePayrollReport}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Report
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
