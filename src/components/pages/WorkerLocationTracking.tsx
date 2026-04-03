import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  MapPin,
  Search,
  Users,
  Navigation,
  Clock,
  Building2,
  Circle,
  Radio
} from 'lucide-react';

interface Worker {
  id: number;
  name: string;
  role: string;
  currentSite: string;
  status: 'on-site' | 'in-transit' | 'offline';
  lastUpdate: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

const mockWorkers: Worker[] = [
  {
    id: 1,
    name: 'John Doe',
    role: 'Foreman',
    currentSite: 'Villa Project - Tirana',
    status: 'on-site',
    lastUpdate: '2 min ago',
    location: {
      lat: 41.3275,
      lng: 19.8187,
      address: 'Rruga Kavajes, Tirana, Albania',
    },
  },
  {
    id: 2,
    name: 'Jane Smith',
    role: 'Worker',
    currentSite: 'Villa Project - Tirana',
    status: 'on-site',
    lastUpdate: '5 min ago',
    location: {
      lat: 41.3276,
      lng: 19.8188,
      address: 'Rruga Kavajes, Tirana, Albania',
    },
  },
  {
    id: 3,
    name: 'Mike Johnson',
    role: 'Worker',
    currentSite: 'Villa Project - Tirana',
    status: 'on-site',
    lastUpdate: '1 min ago',
    location: {
      lat: 41.3274,
      lng: 19.8186,
      address: 'Rruga Kavajes, Tirana, Albania',
    },
  },
  {
    id: 4,
    name: 'Sarah Williams',
    role: 'Specialist',
    currentSite: 'Office Building - Durres',
    status: 'on-site',
    lastUpdate: '3 min ago',
    location: {
      lat: 41.3231,
      lng: 19.4569,
      address: 'Durres Port Area, Albania',
    },
  },
  {
    id: 5,
    name: 'Tom Brown',
    role: 'Worker',
    currentSite: 'En Route',
    status: 'in-transit',
    lastUpdate: '10 min ago',
    location: {
      lat: 41.3150,
      lng: 19.8000,
      address: 'Tirana Ring Road, Albania',
    },
  },
  {
    id: 6,
    name: 'Lisa Davis',
    role: 'Worker',
    currentSite: 'Day Off',
    status: 'offline',
    lastUpdate: '2 hours ago',
    location: {
      lat: 0,
      lng: 0,
      address: 'Location unavailable',
    },
  },
];

interface WorkerLocationTrackingProps {
  userRole: string;
}

export function WorkerLocationTracking({ userRole }: WorkerLocationTrackingProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const canViewLocation = ['admin', 'site_manager'].includes(userRole);

  if (!canViewLocation) {
    return (
      <Card className="p-12 text-center">
        <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-500">
          Location tracking is only available to Admin and Site Manager roles.
        </p>
      </Card>
    );
  }

  const filteredWorkers = mockWorkers.filter(worker => {
    const matchesSearch = worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         worker.currentSite.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || worker.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewOnMap = (worker: Worker) => {
    if (worker.location.lat !== 0) {
      window.open(
        `https://www.google.com/maps?q=${worker.location.lat},${worker.location.lng}`,
        '_blank'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900">Worker Location Tracking</h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time location monitoring for all workers
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search workers or sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="on-site">On Site</SelectItem>
            <SelectItem value="in-transit">In Transit</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Total Workers</p>
          <p className="text-2xl text-gray-900">{mockWorkers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">On Site</p>
          <p className="text-2xl text-green-600">
            {mockWorkers.filter(w => w.status === 'on-site').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">In Transit</p>
          <p className="text-2xl text-yellow-600">
            {mockWorkers.filter(w => w.status === 'in-transit').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Offline</p>
          <p className="text-2xl text-gray-400">
            {mockWorkers.filter(w => w.status === 'offline').length}
          </p>
        </Card>
      </div>

      {/* Worker Location Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredWorkers.map(worker => (
          <Card key={worker.id} className="overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-brand-gradient rounded-full flex items-center justify-center text-white shadow-md">
                    {worker.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-gray-900">{worker.name}</h3>
                    <p className="text-sm text-gray-500">{worker.role}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    worker.status === 'on-site'
                      ? 'default'
                      : worker.status === 'in-transit'
                      ? 'secondary'
                      : 'outline'
                  }
                  className={
                    worker.status === 'on-site'
                      ? 'bg-green-600'
                      : worker.status === 'in-transit'
                      ? 'bg-yellow-600'
                      : ''
                  }
                >
                  <Circle
                    className={`w-2 h-2 mr-1 ${
                      worker.status === 'on-site'
                        ? 'fill-white'
                        : worker.status === 'in-transit'
                        ? 'fill-white'
                        : ''
                    }`}
                  />
                  {worker.status === 'on-site'
                    ? 'On Site'
                    : worker.status === 'in-transit'
                    ? 'In Transit'
                    : 'Offline'}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Current Site</p>
                    <p className="text-gray-900">{worker.currentSite}</p>
                  </div>
                </div>

                {worker.status !== 'offline' && (
                  <>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="text-sm text-gray-900">{worker.location.address}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Last Update</p>
                        <p className="text-sm text-gray-900">{worker.lastUpdate}</p>
                      </div>
                      <Radio className="w-4 h-4 text-green-500 animate-pulse" />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleViewOnMap(worker)}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      View on Map
                    </Button>
                  </>
                )}

                {worker.status === 'offline' && (
                  <div className="bg-gray-50 border rounded-lg p-3 text-center">
                    <p className="text-sm text-gray-500">
                      Worker is offline. Location unavailable.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {worker.status === 'on-site' && (
              <div className="bg-green-50 border-t border-green-100 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-green-700">Active at site</span>
                <Circle className="w-2 h-2 fill-green-600 animate-pulse" />
              </div>
            )}
          </Card>
        ))}
      </div>

      {filteredWorkers.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">No Workers Found</h3>
          <p className="text-gray-500">
            Try adjusting your search or filter criteria.
          </p>
        </Card>
      )}

      {/* Info Notice */}
      <Card className="p-4 bg-brand-50 border-brand-200">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-brand-600 mt-0.5" />
          <div>
            <h4 className="text-sm text-brand-700 mb-1">About Location Tracking</h4>
            <p className="text-xs text-blue-700">
              • Location updates are automatic when workers have the mobile app open
              <br />
              • Workers are NOT aware that their location is being tracked
              <br />
              • This feature is only visible to Admin and Site Manager roles
              <br />
              • Location data is used solely for workforce management and safety
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
