import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Download, FileImage, FileType, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { exportAllPages, captureCurrentPage } from '../utils/exportUI';

interface ExportUIDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  userRole: string;
}

const allPages = [
  { id: 'dashboard', label: 'Dashboard', roles: ['admin', 'product_manager', 'site_manager', 'offer_manager', 'worker', 'sales_agent', 'order_manager', 'office_employee', 'website_manager'] },
  { id: 'products', label: 'Products Management', roles: ['admin', 'product_manager', 'offer_manager', 'sales_agent', 'order_manager'] },
  { id: 'services', label: 'Services Management', roles: ['admin', 'website_manager'] },
  { id: 'sites', label: 'Construction Sites', roles: ['admin', 'site_manager'] },
  { id: 'workers', label: 'Workers Management', roles: ['admin', 'site_manager'] },
  { id: 'assignments', label: 'Worker Assignments', roles: ['admin', 'site_manager'] },
  { id: 'teams', label: 'Team Management', roles: ['admin', 'site_manager'] },
  { id: 'offers', label: 'Offers Management', roles: ['admin', 'offer_manager'] },
  { id: 'service-packages', label: 'Service Packages', roles: ['admin', 'offer_manager'] },
  { id: 'clients', label: 'Clients & Shops', roles: ['admin', 'offer_manager', 'sales_agent', 'order_manager'] },
  { id: 'orders', label: 'Orders Management', roles: ['admin', 'sales_agent', 'order_manager', 'office_employee'] },
  { id: 'website', label: 'Website Manager', roles: ['admin', 'website_manager'] },
  { id: 'chat', label: 'Messages', roles: ['admin', 'worker', 'sales_agent', 'site_manager', 'offer_manager', 'order_manager', 'office_employee'] },
  { id: 'roles', label: 'Roles & Permissions', roles: ['admin'] },
  { id: 'reports', label: 'Reports', roles: ['admin', 'site_manager', 'order_manager'] },
  { id: 'activity-log', label: 'Activity Log', roles: ['admin'] },
  { id: 'settings', label: 'Settings', roles: ['admin', 'website_manager'] },
];

export function ExportUIDialog({ isOpen, onClose, currentPage, setCurrentPage, userRole }: ExportUIDialogProps) {
  const [exportMode, setExportMode] = useState<'current' | 'selected' | 'all'>('current');
  const [exportFormat, setExportFormat] = useState<'svg' | 'png'>('svg');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [delay, setDelay] = useState('1000');

  const accessiblePages = allPages.filter(page => page.roles.includes(userRole));

  const togglePageSelection = (pageId: string) => {
    setSelectedPages(prev =>
      prev.includes(pageId)
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const selectAllPages = () => {
    setSelectedPages(accessiblePages.map(p => p.id));
  };

  const deselectAllPages = () => {
    setSelectedPages([]);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('idle');

    try {
      if (exportMode === 'current') {
        // Export current page only
        await captureCurrentPage(currentPage, exportFormat);
        setExportProgress(100);
        setExportStatus('success');
      } else if (exportMode === 'selected') {
        // Export selected pages
        if (selectedPages.length === 0) {
          alert('Please select at least one page to export');
          setIsExporting(false);
          return;
        }
        
        for (let i = 0; i < selectedPages.length; i++) {
          const page = selectedPages[i];
          setCurrentPage(page);
          await new Promise(resolve => setTimeout(resolve, parseInt(delay)));
          await captureCurrentPage(page, exportFormat);
          setExportProgress(((i + 1) / selectedPages.length) * 100);
        }
        setExportStatus('success');
      } else {
        // Export all accessible pages
        const pagesToExport = accessiblePages.map(p => p.id);
        
        for (let i = 0; i < pagesToExport.length; i++) {
          const page = pagesToExport[i];
          setCurrentPage(page);
          await new Promise(resolve => setTimeout(resolve, parseInt(delay)));
          await captureCurrentPage(page, exportFormat);
          setExportProgress(((i + 1) / pagesToExport.length) * 100);
        }
        setExportStatus('success');
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setExportProgress(0);
        setExportStatus('idle');
      }, 3000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export UI as Design Files
          </DialogTitle>
          <DialogDescription>
            Export pages and components as SVG or PNG files for design documentation or Figma import
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Export Mode */}
          <div className="space-y-3">
            <Label>Export Mode</Label>
            <RadioGroup value={exportMode} onValueChange={(value: any) => setExportMode(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="current" id="current" />
                <label htmlFor="current" className="flex-1 cursor-pointer">
                  <p className="text-sm text-gray-900">Current Page Only</p>
                  <p className="text-xs text-gray-500">Export the currently visible page</p>
                </label>
                <Badge variant="outline">{currentPage}</Badge>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="selected" id="selected" />
                <label htmlFor="selected" className="flex-1 cursor-pointer">
                  <p className="text-sm text-gray-900">Selected Pages</p>
                  <p className="text-xs text-gray-500">Choose specific pages to export</p>
                </label>
                {selectedPages.length > 0 && (
                  <Badge>{selectedPages.length} selected</Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="all" id="all" />
                <label htmlFor="all" className="flex-1 cursor-pointer">
                  <p className="text-sm text-gray-900">All Accessible Pages</p>
                  <p className="text-xs text-gray-500">Export all pages you have access to</p>
                </label>
                <Badge variant="secondary">{accessiblePages.length} pages</Badge>
              </div>
            </RadioGroup>
          </div>

          {/* Page Selection (only shown when "selected" mode is active) */}
          {exportMode === 'selected' && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <Label>Select Pages to Export</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllPages}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllPages}>
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {accessiblePages.map(page => (
                  <div
                    key={page.id}
                    className={`flex items-center space-x-2 p-2 border rounded cursor-pointer transition-colors ${
                      selectedPages.includes(page.id) ? 'bg-blue-50 border-blue-500' : 'bg-white hover:bg-gray-100'
                    }`}
                    onClick={() => togglePageSelection(page.id)}
                  >
                    <Checkbox
                      checked={selectedPages.includes(page.id)}
                      onCheckedChange={() => togglePageSelection(page.id)}
                    />
                    <span className="text-sm text-gray-900">{page.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Format */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="svg" id="svg" />
                <FileType className="w-5 h-5 text-blue-600" />
                <label htmlFor="svg" className="flex-1 cursor-pointer">
                  <p className="text-sm text-gray-900">SVG (Vector)</p>
                  <p className="text-xs text-gray-500">Best for Figma import and scaling</p>
                </label>
                <Badge variant="default">Recommended</Badge>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="png" id="png" />
                <FileImage className="w-5 h-5 text-green-600" />
                <label htmlFor="png" className="flex-1 cursor-pointer">
                  <p className="text-sm text-gray-900">PNG (Raster)</p>
                  <p className="text-xs text-gray-500">High quality image format</p>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3">
            <Label>Render Delay (milliseconds)</Label>
            <Select value={delay} onValueChange={setDelay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="500">500ms - Fast</SelectItem>
                <SelectItem value="1000">1000ms - Normal</SelectItem>
                <SelectItem value="2000">2000ms - Slow (Better Quality)</SelectItem>
                <SelectItem value="3000">3000ms - Very Slow (Best Quality)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Time to wait for each page to fully render before capturing
            </p>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-900">Exporting... {Math.round(exportProgress)}%</span>
              </div>
              <Progress value={exportProgress} className="w-full" />
            </div>
          )}

          {/* Export Status */}
          {exportStatus === 'success' && !isExporting && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-900">Export completed successfully!</span>
            </div>
          )}

          {exportStatus === 'error' && !isExporting && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-900">Export failed. Please try again.</span>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              <strong>Note:</strong> The export process will switch between pages automatically. 
              Please don't interact with the application during export. Downloads will start automatically.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {exportMode === 'current' ? 'Page' : exportMode === 'selected' ? `${selectedPages.length} Pages` : `${accessiblePages.length} Pages`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
