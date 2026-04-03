import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Building2, 
  Users, 
  Calendar, 
  Car,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Download,
  FileText,
  MapPin,
  Settings
} from 'lucide-react';

interface SiteManagerDashboardProps {
  userRole: string;
}

export function SiteManagerDashboard({ userRole }: SiteManagerDashboardProps) {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <Badge variant="outline" className="text-xs">+2</Badge>
          </div>
          <p className="text-3xl text-gray-900 mb-1">12</p>
          <p className="text-sm text-gray-500">Active Sites</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <Badge variant="outline" className="text-xs">+5</Badge>
          </div>
          <p className="text-3xl text-gray-900 mb-1">120</p>
          <p className="text-sm text-gray-500">Total Workers</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <Badge variant="outline" className="text-xs">Today</Badge>
          </div>
          <p className="text-3xl text-gray-900 mb-1">45</p>
          <p className="text-sm text-gray-500">Assignments Today</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-brand-600" />
            </div>
            <Badge variant="outline" className="text-xs">Active</Badge>
          </div>
          <p className="text-3xl text-gray-900 mb-1">18</p>
          <p className="text-sm text-gray-500">Available Cars</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => handleNavigation('/site-manager/create-assignment')}
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">Manage Assignments</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => handleNavigation('/reports')}
          >
            <Download className="w-5 h-5" />
            <span className="text-sm">Export Reports</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => handleNavigation('/reports')}
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm">View Reports</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => handleNavigation('/sites')}
          >
            <Building2 className="w-5 h-5" />
            <span className="text-sm">Manage Sites</span>
          </Button>
        </div>
      </Card>

      {/* Today's Assignments Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-gray-900">Today&apos;s Assignments</h3>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
        
        <div className="space-y-3">
          {[
            { site: 'Villa Project - Tirana', workers: 12, car: 'Van 01 (AA-123-BB)', status: 'In Progress' },
            { site: 'Office Building - Durres', workers: 8, car: 'Truck 02 (CC-456-DD)', status: 'In Progress' },
            { site: 'Residential Complex', workers: 15, car: 'Van 03 (EE-789-FF)', status: 'Completed' },
            { site: 'Shopping Mall Renovation', workers: 10, car: 'Truck 01 (GG-234-HH)', status: 'In Progress' },
          ].map((assignment, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-900">{assignment.site}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{assignment.workers} workers</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{assignment.car}</span>
                  </div>
                </div>
              </div>
              <Badge variant={assignment.status === 'Completed' ? 'default' : 'secondary'}>
                {assignment.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Worker Availability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg text-gray-900 mb-4">Worker Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-900">Assigned</span>
              </div>
              <span className="text-sm text-gray-900">98 workers</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-gray-900">Available</span>
              </div>
              <span className="text-sm text-gray-900">22 workers</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-gray-900">Day Off</span>
              </div>
              <span className="text-sm text-gray-900">5 workers</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg text-gray-900 mb-4">Sites Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-900">Active Sites</span>
              </div>
              <span className="text-sm text-gray-900">12 sites</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-gray-900">Starting Soon</span>
              </div>
              <span className="text-sm text-gray-900">3 sites</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-brand-600" />
                <span className="text-sm text-gray-900">Completed This Month</span>
              </div>
              <span className="text-sm text-gray-900">8 sites</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
