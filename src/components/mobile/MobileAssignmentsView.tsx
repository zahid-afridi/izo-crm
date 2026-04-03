'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Loader, Search, MapPin, Users, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Site {
  id: string;
  name: string;
  address: string;
  city?: string;
  status: string;
  isCompleted?: boolean;
  siteStatus?: string;
}

interface Worker {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  isLocked: boolean;
}

interface Car {
  id: string;
  name: string;
  number: string;
  color: string;
}

interface SiteAssignment {
  id: string;
  workerId: string;
  workerName: string;
  workerEmail: string;
  workerPhone?: string;
  workerRole: string;
  workerIsLocked: boolean;
  carId?: string;
  car?: Car;
  assignedDate: string;
  status: string;
  notes?: string;
  createdAt: string;
}

interface SiteData {
  id: string;
  name: string;
  address: string;
  city?: string;
  siteStatus: string;
  isCompleted: boolean;
  workers: SiteAssignment[];
}

interface MobileAssignmentsViewProps {
  userRole: string;
}

export function MobileAssignmentsView({ userRole }: MobileAssignmentsViewProps) {
  const [sites, setSites] = useState<SiteData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);

  const canEdit = ['admin', 'site_manager'].includes(userRole);

  useEffect(() => {
    fetchAssignments();
  }, [selectedDate]);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const url = selectedDate
        ? `/api/assignments/by-site?date=${selectedDate}`
        : `/api/assignments/by-site`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch assignments');
      
      const data = await response.json();
      console.log('assighment data',data)
      setSites(data.assignments || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      toast.error('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const isSiteCompleted = (site: SiteData) => {
    return site.isCompleted || site.siteStatus === 'completed';
  };

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedSites = filteredSites.filter(isSiteCompleted);
  const activeSites = filteredSites.filter(s => !isSiteCompleted(s));

  if (isLoading && sites.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 p-4">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl text-gray-900 font-semibold mb-2">Assignments</h2>
        <p className="text-sm text-gray-600">
          {selectedDate
            ? `Showing assignments for ${new Date(selectedDate).toLocaleDateString()}`
            : 'Showing all assignments'}
        </p>
      </div>

      {/* Date Filter */}
      <Card className="p-4 bg-white border border-gray-200">
        <label className="text-sm text-gray-600 block mb-2">Filter by Date</label>
        <div className="flex gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 text-sm"
          />
          {selectedDate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate('')}
              className="text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search sites..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 bg-white border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Active Sites</p>
          <p className="text-2xl font-semibold text-brand-600">{activeSites.length}</p>
        </Card>
        <Card className="p-3 bg-white border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Completed</p>
          <p className="text-2xl font-semibold text-green-600">{completedSites.length}</p>
        </Card>
      </div>

      {/* Active Sites */}
      {activeSites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Active Sites</h3>
          {activeSites.map(site => (
            <Card
              key={site.id}
              className="overflow-hidden border border-gray-200 bg-white"
            >
              <button
                onClick={() => setExpandedSiteId(expandedSiteId === site.id ? null : site.id)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                      {site.name}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{site.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {site.workers.length} worker{site.workers.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-gray-400 flex-shrink-0">
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        expandedSiteId === site.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {expandedSiteId === site.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                  {site.workers.map(worker => (
                    <div
                      key={worker.id}
                      className="bg-white p-3 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {worker.workerName}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">{worker.workerRole}</p>
                        </div>
                        {worker.workerIsLocked && (
                          <Badge variant="destructive" className="text-xs flex-shrink-0">
                            Locked
                          </Badge>
                        )}
                      </div>

                      {/* Worker Contact */}
                      {worker.workerPhone && (
                        <button
                          onClick={() => window.open(`tel:${worker.workerPhone}`)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium mb-2 block"
                        >
                          📞 {worker.workerPhone}
                        </button>
                      )}

                      {/* Car Info */}
                      {worker.car && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                          <p className="text-xs font-medium text-blue-700">
                            🚗 {worker.car.name} - {worker.car.number}
                          </p>
                        </div>
                      )}

                      {/* Assignment Date */}
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(worker.assignedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Notes */}
                      {worker.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                          <p className="text-xs text-gray-700">{worker.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Completed Sites */}
      {completedSites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Completed Sites</h3>
          {completedSites.map(site => (
            <Card
              key={site.id}
              className="overflow-hidden border border-gray-200 bg-gray-50 opacity-75"
            >
              <button
                onClick={() => setExpandedSiteId(expandedSiteId === site.id ? null : site.id)}
                className="w-full p-4 text-left hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-700 text-sm truncate">
                        {site.name}
                      </h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 flex-shrink-0">
                        ✓ Complete
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{site.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {site.workers.length} worker{site.workers.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-gray-400 flex-shrink-0">
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        expandedSiteId === site.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {expandedSiteId === site.id && (
                <div className="border-t border-gray-200 p-4 bg-white space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">This site is completed</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Assignments are read-only and cannot be modified
                    </p>
                  </div>

                  {site.workers.map(worker => (
                    <div
                      key={worker.id}
                      className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-700 text-sm truncate">
                            {worker.workerName}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">{worker.workerRole}</p>
                        </div>
                        {worker.workerIsLocked && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            Locked
                          </Badge>
                        )}
                      </div>

                      {/* Worker Contact */}
                      {worker.workerPhone && (
                        <button
                          onClick={() => window.open(`tel:${worker.workerPhone}`)}
                          className="text-xs text-gray-600 hover:text-gray-700 font-medium mb-2 block"
                        >
                          📞 {worker.workerPhone}
                        </button>
                      )}

                      {/* Car Info */}
                      {worker.car && (
                        <div className="bg-gray-100 border border-gray-300 rounded p-2 mb-2">
                          <p className="text-xs font-medium text-gray-700">
                            🚗 {worker.car.name} - {worker.car.number}
                          </p>
                        </div>
                      )}

                      {/* Assignment Date */}
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(worker.assignedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Notes */}
                      {worker.notes && (
                        <div className="mt-2 p-2 bg-gray-100 rounded border border-gray-300">
                          <p className="text-xs text-gray-700">{worker.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredSites.length === 0 && !isLoading && (
        <Card className="p-8 text-center bg-white border border-gray-200">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-gray-900 font-semibold mb-1">No Assignments Found</h3>
          <p className="text-sm text-gray-600">
            {searchQuery
              ? 'Try adjusting your search criteria'
              : selectedDate
              ? `No assignments for ${new Date(selectedDate).toLocaleDateString()}`
              : 'No assignments available'}
          </p>
        </Card>
      )}
    </div>
  );
}
