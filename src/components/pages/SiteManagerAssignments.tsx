'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  Car, 
  Building2, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff,
  Save,
  Loader,
  AlertCircle,
  CheckCircle,
  Clock,
  UserX,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../ui/alert';

interface Worker {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  isLocked: boolean;
  status: string;
  worker?: {
    hourlyRate?: number;
    monthlyRate?: number;
  };
}

interface Car {
  id: string;
  name: string;
  number: string;
  color: string;
  model: string;
  status: string;
  isLocked: boolean;
}

interface Site {
  id: string;
  name: string;
  address: string;
  city?: string;
  status: string;
  client?: string;
}

interface Assignment {
  id: string;
  siteId: string;
  workerId: string;
  carId?: string;
  assignedDate: string;
  status: string;
  notes?: string;
  isWorkerLocked?: boolean;
  isCarLocked?: boolean;
}

interface DailyProgram {
  date: string;
  assignments: Assignment[];
  sites: Site[];
  workers: Worker[];
  cars: Car[];
  workersOnDayOff: string[];
  isFinalized: boolean;
  allowWorkersToSeeFullProgram: boolean;
}

export function SiteManagerAssignments() {
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today's date
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [dailyProgram, setDailyProgram] = useState<DailyProgram | null>(null);
  const [allWorkers, setAllWorkers] = useState<Worker[]>([]);
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedCar, setSelectedCar] = useState<string>('');
  const [lockSelectedWorkers, setLockSelectedWorkers] = useState(false);
  const [lockSelectedCar, setLockSelectedCar] = useState(false);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [workersOnDayOff, setWorkersOnDayOff] = useState<string[]>([]);
  const [allowFullProgramView, setAllowFullProgramView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDailyProgram();
    }
  }, [selectedDate]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [workersRes, carsRes, sitesRes] = await Promise.all([
        fetch('/api/workers'),
        fetch('/api/cars'),
        fetch('/api/sites'),
      ]);

      if (!workersRes.ok || !carsRes.ok || !sitesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const workersData = await workersRes.json();
      const carsData = await carsRes.json();
      const sitesData = await sitesRes.json();

      setAllWorkers(workersData.workers || []);
      setAllCars(carsData.cars || []);
      setAllSites(sitesData.sites || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDailyProgram = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/assignments/by-site?date=${selectedDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch daily program');
      }

      const data = await response.json();
      
      // Convert to our daily program format
      const assignments: Assignment[] = [];
      const sites: Site[] = [];
      const workers: Worker[] = [];
      const cars: Car[] = [];

      data.assignments?.forEach((siteData: any) => {
        sites.push({
          id: siteData.id,
          name: siteData.name,
          address: siteData.address,
          city: siteData.city,
          status: siteData.status,
          client: siteData.client
        });

        siteData.workers?.forEach((worker: any) => {
          assignments.push({
            id: worker.id,
            siteId: siteData.id,
            workerId: worker.workerId,
            carId: worker.car?.id,
            assignedDate: worker.assignedDate,
            status: worker.status,
            notes: worker.notes,
            isWorkerLocked: worker.workerIsLocked,
            isCarLocked: worker.car?.isLocked
          });

          // Add worker if not already added
          if (!workers.find(w => w.id === worker.workerId)) {
            workers.push({
              id: worker.workerId,
              fullName: worker.workerName,
              email: worker.workerEmail,
              phone: worker.workerPhone,
              isLocked: worker.workerIsLocked,
              status: 'active'
            });
          }

          // Add car if not already added
          if (worker.car && !cars.find(c => c.id === worker.car.id)) {
            cars.push({
              id: worker.car.id,
              name: worker.car.name,
              number: worker.car.number,
              color: worker.car.color,
              model: worker.car.model,
              status: 'active',
              isLocked: worker.car.isLocked
            });
          }
        });
      });

      setDailyProgram({
        date: selectedDate,
        assignments,
        sites,
        workers,
        cars,
        workersOnDayOff: [],
        isFinalized: false,
        allowWorkersToSeeFullProgram: false
      });

    } catch (error) {
      console.error('Error fetching daily program:', error);
      toast.error('Failed to load daily program');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableWorkers = () => {
    if (!dailyProgram) return [];
    
    const assignedWorkerIds = dailyProgram.assignments
      .filter(a => lockSelectedWorkers ? a.isWorkerLocked : true)
      .map(a => a.workerId);
    
    return allWorkers.filter(worker => 
      !assignedWorkerIds.includes(worker.id) &&
      !workersOnDayOff.includes(worker.id) &&
      worker.status === 'active' &&
      !worker.isLocked &&
      worker.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getAvailableCars = () => {
    if (!dailyProgram) return [];
    
    const assignedCarIds = dailyProgram.assignments
      .filter(a => lockSelectedCar ? a.isCarLocked : true)
      .map(a => a.carId)
      .filter(Boolean);
    
    return allCars.filter(car => 
      !assignedCarIds.includes(car.id) &&
      car.status === 'active' &&
      !car.isLocked
    );
  };

  const handleCreateAssignment = async () => {
    if (!selectedSite || selectedWorkers.length === 0) {
      toast.error('Please select a site and at least one worker');
      return;
    }

    try {
      setIsLoading(true);

      // Create assignments for each selected worker
      const assignmentPromises = selectedWorkers.map(workerId => 
        fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteId: selectedSite,
            workerIds: [workerId],
            carId: selectedCar || null,
            assignedDate: selectedDate,
            notes: assignmentNotes,
            lockWorkers: lockSelectedWorkers,
            lockCar: lockSelectedCar
          })
        })
      );

      const responses = await Promise.all(assignmentPromises);
      
      // Check if all requests were successful
      const failedRequests = responses.filter(res => !res.ok);
      if (failedRequests.length > 0) {
        throw new Error(`Failed to create ${failedRequests.length} assignments`);
      }

      toast.success(`Created ${selectedWorkers.length} assignments successfully`);
      
      // Reset form
      setSelectedSite('');
      setSelectedWorkers([]);
      setSelectedCar('');
      setLockSelectedWorkers(false);
      setLockSelectedCar(false);
      setAssignmentNotes('');
      setIsCreateDialogOpen(false);
      
      // Refresh data
      fetchDailyProgram();

    } catch (error) {
      console.error('Error creating assignments:', error);
      toast.error('Failed to create assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkerDayOff = (workerId: string, isOff: boolean) => {
    if (isOff) {
      setWorkersOnDayOff(prev => [...prev, workerId]);
    } else {
      setWorkersOnDayOff(prev => prev.filter(id => id !== workerId));
    }
  };

  const handleAllWorkersOffDay = (allOff: boolean) => {
    if (allOff) {
      const availableWorkerIds = getAvailableWorkers().map(w => w.id);
      setWorkersOnDayOff(prev => [...new Set([...prev, ...availableWorkerIds])]);
    } else {
      setWorkersOnDayOff([]);
    }
  };

  const handleFinalizeDailyProgram = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/assignments/finalize-daily-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          workersOnDayOff,
          allowWorkersToSeeFullProgram: allowFullProgramView
        })
      });

      if (!response.ok) {
        throw new Error('Failed to finalize daily program');
      }

      toast.success('Daily program finalized successfully');
      fetchDailyProgram();

    } catch (error) {
      console.error('Error finalizing daily program:', error);
      toast.error('Failed to finalize daily program');
    } finally {
      setIsLoading(false);
    }
  };

  const getSiteAssignments = (siteId: string) => {
    return dailyProgram?.assignments.filter(a => a.siteId === siteId) || [];
  };

  const getWorkerById = (workerId: string) => {
    return allWorkers.find(w => w.id === workerId);
  };

  const getCarById = (carId: string) => {
    return allCars.find(c => c.id === carId);
  };

  if (isLoading && !dailyProgram) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Assignment Management</h1>
          <p className="text-gray-600">Manage worker and car assignments for construction sites</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{dailyProgram?.sites.length || 0}</p>
              <p className="text-sm text-gray-600">Active Sites</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{dailyProgram?.assignments.length || 0}</p>
              <p className="text-sm text-gray-600">Assigned Workers</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">{getAvailableWorkers().length}</p>
              <p className="text-sm text-gray-600">Available Workers</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Car className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{getAvailableCars().length}</p>
              <p className="text-sm text-gray-600">Available Cars</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Site Assignments */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Site Assignments for {selectedDate}</h3>
        
        {dailyProgram?.sites.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No site assignments for this date</p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="mt-4"
            >
              Create First Assignment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {dailyProgram?.sites.map(site => {
              const siteAssignments = getSiteAssignments(site.id);
              return (
                <Card key={site.id} className="p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{site.name}</h4>
                      <p className="text-sm text-gray-600">{site.address}, {site.city}</p>
                      {site.client && (
                        <p className="text-sm text-gray-500">Client: {site.client}</p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {siteAssignments.length} workers
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Assigned Workers</h5>
                      <div className="space-y-2">
                        {siteAssignments.map(assignment => {
                          const worker = getWorkerById(assignment.workerId);
                          return (
                            <div key={assignment.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{worker?.fullName}</span>
                              {assignment.isWorkerLocked && (
                                <Lock className="w-3 h-3 text-red-500" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Assigned Cars</h5>
                      <div className="space-y-2">
                        {siteAssignments
                          .filter(a => a.carId)
                          .map(assignment => {
                            const car = getCarById(assignment.carId!);
                            return (
                              <div key={assignment.carId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                <Car className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">
                                  {car?.name} ({car?.number}) - {car?.color}
                                </span>
                                {assignment.isCarLocked && (
                                  <Lock className="w-3 h-3 text-red-500" />
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Available Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Available Workers</h3>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allWorkersOff"
                checked={workersOnDayOff.length === getAvailableWorkers().length && getAvailableWorkers().length > 0}
                onCheckedChange={handleAllWorkersOffDay}
              />
              <Label htmlFor="allWorkersOff" className="text-sm">All workers off</Label>
            </div>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {getAvailableWorkers().map(worker => (
              <div key={worker.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{worker.fullName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`dayoff-${worker.id}`}
                    checked={workersOnDayOff.includes(worker.id)}
                    onCheckedChange={(checked) => handleWorkerDayOff(worker.id, checked as boolean)}
                  />
                  <Label htmlFor={`dayoff-${worker.id}`} className="text-xs">Day off</Label>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Available Cars</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {getAvailableCars().map(car => (
              <div key={car.id} className="flex items-center gap-2 p-2 border rounded">
                <Car className="w-4 h-4 text-gray-400" />
                <span className="text-sm">
                  {car.name} ({car.number}) - {car.color} {car.model}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Finalize Section */}
      {getAvailableWorkers().length === 0 && (
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800">Ready to Finalize</h3>
          </div>
          
          <p className="text-green-700 mb-4">
            All workers have been assigned or marked as day off. You can now finalize the daily program.
          </p>
          
          <div className="flex items-center gap-4 mb-4">
            <Checkbox
              id="allowFullView"
              checked={allowFullProgramView}
              onCheckedChange={(checked) => setAllowFullProgramView(checked === true)}
            />
            <Label htmlFor="allowFullView">
              Allow workers to see the full daily program (all sites and workers)
            </Label>
          </div>
          
          <Button onClick={handleFinalizeDailyProgram} className="bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />
            Finalize Daily Program
          </Button>
        </Card>
      )}

      {/* Create Assignment Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Site</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a site" />
                </SelectTrigger>
                <SelectContent>
                  {allSites.map(site => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name} - {site.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Search and Select Workers</Label>
              <Input
                placeholder="Search workers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
                {getAvailableWorkers().map(worker => (
                  <div key={worker.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`worker-${worker.id}`}
                      checked={selectedWorkers.includes(worker.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedWorkers(prev => [...prev, worker.id]);
                        } else {
                          setSelectedWorkers(prev => prev.filter(id => id !== worker.id));
                        }
                      }}
                    />
                    <Label htmlFor={`worker-${worker.id}`} className="text-sm">
                      {worker.fullName}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="lockWorkers"
                  checked={lockSelectedWorkers}
                  onCheckedChange={(checked) => setLockSelectedWorkers(checked === true)}
                />
                <Label htmlFor="lockWorkers" className="text-sm">
                  Lock selected workers (won't appear in other assignments for this date)
                </Label>
              </div>
            </div>

            <div>
              <Label>Select Car (Optional)</Label>
              <Select value={selectedCar} onValueChange={setSelectedCar}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a car" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No car assigned</SelectItem>
                  {getAvailableCars().map(car => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.name} ({car.number}) - {car.color} {car.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="lockCar"
                  checked={lockSelectedCar}
                  onCheckedChange={(checked) => setLockSelectedCar(checked === true)}
                />
                <Label htmlFor="lockCar" className="text-sm">
                  Lock selected car (won't appear in other assignments for this date)
                </Label>
              </div>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Input
                placeholder="Assignment notes..."
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAssignment} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Assignment'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}