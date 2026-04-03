import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Download, Calendar } from 'lucide-react';

interface ExportAssignmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportAssignmentsDialog({ open, onOpenChange }: ExportAssignmentsDialogProps) {
  const [exportType, setExportType] = useState<'date' | 'range' | 'month'>('date');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const handleExport = () => {
    if (exportType === 'date') {
      alert(`Exporting assignments for ${selectedDate}\n\nFormat: Excel\nIncludes: Date, Site Name, Car (Name & Plate), Workers`);
    } else if (exportType === 'range') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      alert(`Exporting assignments for date range\n\nFrom: ${startDate}\nTo: ${endDate}\nTotal Days: ${days}\n\nFormat: Excel\nIncludes: Date, Site Name, Car, Workers`);
    } else if (exportType === 'month') {
      const [year, month] = selectedMonth.split('-');
      const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      alert(`Exporting all assignments for ${monthName}\n\nFormat: Excel\nIncludes: Date, Site Name, Car, Workers`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Assignments Program</DialogTitle>
          <DialogDescription>
            Export assignments to Excel (Date, Site Name, Car, Workers)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Export Type</Label>
            <RadioGroup value={exportType} onValueChange={(val: any) => setExportType(val)} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="date" id="date" />
                <Label htmlFor="date" className="cursor-pointer">Specific Date</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="range" id="range" />
                <Label htmlFor="range" className="cursor-pointer">Date Range</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="month" />
                <Label htmlFor="month" className="cursor-pointer">Entire Month</Label>
              </div>
            </RadioGroup>
          </div>

          {exportType === 'date' && (
            <div>
              <Label>Select Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-2"
              />
            </div>
          )}

          {exportType === 'range' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {exportType === 'month' && (
            <div>
              <Label>Select Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="mt-2"
              />
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm text-blue-900 mb-2">Export Details</h4>
            <div className="space-y-1 text-xs text-blue-700">
              <p>• <span className="font-medium">Format:</span> Excel (.xlsx)</p>
              <p>• <span className="font-medium">Columns:</span> Date, Site Name, Car (Name & Plate), Workers (Names)</p>
              {exportType === 'date' && (
                <p>• <span className="font-medium">Date:</span> {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              )}
              {exportType === 'range' && (
                <>
                  <p>• <span className="font-medium">From:</span> {new Date(startDate).toLocaleDateString()}</p>
                  <p>• <span className="font-medium">To:</span> {new Date(endDate).toLocaleDateString()}</p>
                  <p>• <span className="font-medium">Days:</span> {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}</p>
                </>
              )}
              {exportType === 'month' && (
                <p>• <span className="font-medium">Month:</span> {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
