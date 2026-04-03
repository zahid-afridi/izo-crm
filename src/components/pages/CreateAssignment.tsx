"use client";

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import {
  Plus,
  X,
  Users,
  Car,
  Building2,
  Download,
  Save,
  UserX,
  Trash2,
  Loader
} from 'lucide-react';
import { toast } from 'sonner';

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
}

interface Assignment {
  id: string;
  siteId: string;
  workerId: string;
  carId?: string;
  assignedDate: string;
  status: string;
  notes?: string;
  site: Site;
  worker: Worker;
  car?: Car;
}

interface LocalAssignment {
  id: string;
  site: Site;
  car: Car;
  workers: Worker[];
  workersLocked: boolean;
  carLocked: boolean;
}

interface CreateAssignmentProps {
  userRole: string;
}

export function CreateAssignment({ userRole }: CreateAssignmentProps) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(''); // Empty string means "all dates"
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);
  const [availableCars, setAvailableCars] = useState<Car[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [assignments, setAssignments] = useState<LocalAssignment[]>([]);
  const [workersOnDayOff, setWorkersOnDayOff] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<any>({
    site: null,
    car: null,
    workers: [],
    workersLocked: true,
    carLocked: true,
    activeTab: 'workers', // Default to workers tab
    assignmentDate: '', // Separate date for the dialog
  });
  const [allowFullView, setAllowFullView] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const addAssignment = () => {
    if (!currentAssignment.assignmentDate || !currentAssignment.site || !currentAssignment.car || currentAssignment.workers.length === 0) {
      alert('Please select assignment date, site, car, and at least one worker');
      return;
    }

    const newAssignment: LocalAssignment = {
      id: Date.now().toString(),
      site: currentAssignment.site,
      car: currentAssignment.car,
      workers: currentAssignment.workers,
      workersLocked: currentAssignment.workersLocked,
      carLocked: currentAssignment.carLocked,
    };

    setAssignments([...assignments, newAssignment]);

    // Update available pools
    if (currentAssignment.workersLocked) {
      setAvailableWorkers(availableWorkers.filter(w =>
        !currentAssignment.workers.find((cw: any) => cw.id === w.id)
      ));
    }

    if (currentAssignment.carLocked) {
      setAvailableCars(availableCars.filter(c => c.id !== currentAssignment.car.id));
    }

    // Reset form
    setCurrentAssignment({
      site: null,
      car: null,
      workers: [],
      workersLocked: true,
      carLocked: true,
      activeTab: 'workers',
      assignmentDate: '',
    });
    setShowAddAssignment(false);
  };

  const removeAssignment = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    // Return workers to pool if they were locked
    if (assignment.workersLocked) {
      setAvailableWorkers([...availableWorkers, ...assignment.workers]);
    }

    // Return car to pool if it was locked
    if (assignment.carLocked) {
      setAvailableCars([...availableCars, assignment.car]);
    }

    setAssignments(assignments.filter(a => a.id !== assignmentId));
  };

  const markWorkerDayOff = (worker: any) => {
    setWorkersOnDayOff([...workersOnDayOff, worker]);
    setAvailableWorkers(availableWorkers.filter(w => w.id !== worker.id));
  };

  const markAllDayOff = () => {
    if (confirm('Mark all remaining workers as day off?')) {
      setWorkersOnDayOff([...workersOnDayOff, ...availableWorkers]);
      setAvailableWorkers([]);
    }
  };

  const returnWorkerFromDayOff = (worker: any) => {
    setWorkersOnDayOff(workersOnDayOff.filter(w => w.id !== worker.id));
    setAvailableWorkers([...availableWorkers, worker]);
  };

  const finalizeAssignments = () => {
    if (assignments.length === 0) {
      alert('No assignments created yet!');
      return;
    }
    alert(`Assignments finalized for ${selectedDate}!\n${assignments.length} assignments created.\nWorkers can ${allowFullView ? 'see full program' : 'only see their assignments'}.`);
    setShowFinalizeDialog(false);
  };

  const exportProgram = () => {
    alert(`Exporting daily program for ${selectedDate}...\nFormat: Excel\nIncludes: Date, Site Name, Car, Workers`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900">Create Daily Assignment</h2>
          <p className="text-sm text-gray-500 mt-1">Assign workers and cars to construction sites</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export Program
          </Button>
          <Button onClick={() => setShowFinalizeDialog(true)}>
            <Save className="w-4 h-4 mr-2" />
            Finalize & Save
          </Button>
        </div>
      </div>

      {/* Date Selector */}
      <Card className="p-6">
        <Label>Assignment Date</Label>
        <div className="flex items-center gap-4 mt-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-64"
          />
          <Badge variant="outline">
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Badge>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Assignments Created</p>
          <p className="text-2xl text-gray-900">{assignments.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Workers Assigned</p>
          <p className="text-2xl text-gray-900">
            {assignments.reduce((sum, a) => sum + a.workers.length, 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Available Workers</p>
          <p className="text-2xl text-gray-900">{availableWorkers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Day Off</p>
          <p className="text-2xl text-gray-900">{workersOnDayOff.length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Workers Pool */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Available Workers ({availableWorkers.length})
            </h3>
            {availableWorkers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllDayOff}
              >
                <UserX className="w-4 h-4 mr-1" />
                All Day Off
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableWorkers.map(worker => (
              <div
                key={worker.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div>
                  <p className="text-sm text-gray-900">{worker.fullName}</p>
                  <p className="text-xs text-gray-500">{worker.role}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markWorkerDayOff(worker)}
                >
                  <UserX className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {availableWorkers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                All workers assigned or on day off
              </p>
            )}
          </div>
        </Card>

        {/* Assignments List */}
        <Card className="lg:col-span-2 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Assignments ({assignments.length})
            </h3>
            <Button onClick={() => setShowAddAssignment(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Assignment
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {assignments.map(assignment => (
              <Card key={assignment.id} className="p-4 border-2">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm text-gray-900 mb-1">{assignment.site.name}</h4>
                    <p className="text-xs text-gray-500">{assignment.site.address}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAssignment(assignment.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{assignment.car.name}</span>
                  <span className="text-xs text-gray-500">({assignment.car.number})</span>
                  <Badge variant={assignment.carLocked ? 'default' : 'secondary'} className="text-xs">
                    {assignment.carLocked ? 'Locked' : 'Free'}
                  </Badge>
                </div>

                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1">
                      {assignment.workers.map((worker: any) => (
                        <Badge key={worker.id} variant="outline" className="text-xs">
                          {worker.fullName}
                        </Badge>
                      ))}
                    </div>
                    <Badge variant={assignment.workersLocked ? 'default' : 'secondary'} className="text-xs mt-2">
                      {assignment.workersLocked ? 'Workers Locked' : 'Workers Free'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}

            {assignments.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No assignments created yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowAddAssignment(true)}
                >
                  Create First Assignment
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Workers on Day Off */}
      {workersOnDayOff.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm text-gray-900 mb-3 flex items-center gap-2">
            <UserX className="w-4 h-4" />
            Workers on Day Off ({workersOnDayOff.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {workersOnDayOff.map(worker => (
              <Badge
                key={worker.id}
                variant="secondary"
                className="cursor-pointer hover:bg-gray-300"
                onClick={() => returnWorkerFromDayOff(worker)}
              >
                {worker.fullName}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Add Assignment Dialog */}
      <Dialog open={showAddAssignment} onOpenChange={setShowAddAssignment}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Assign workers and a car to a construction site
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Assignment Date */}
            <div>
              <Label>Assignment Date</Label>
              <Input
                type="date"
                value={currentAssignment.assignmentDate}
                onChange={(e) => setCurrentAssignment({ ...currentAssignment, assignmentDate: e.target.value })}
                className="w-full"
              />
            </div>

            {/* Select Site */}
            <div>
              <Label>Construction Site</Label>
              <Select
                value={currentAssignment.site?.id.toString()}
                onValueChange={(val) => {
                  const site = availableSites.find(s => s.id === val);
                  setCurrentAssignment({ ...currentAssignment, site });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {availableSites
                    .filter(site => site.status === 'active')
                    .filter(site => !assignments.some(assignment => assignment.site.id === site.id))
                    .map(site => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name} - {site.address}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Car */}
            <div>
              <Label>Car</Label>
              <Select
                value={currentAssignment.car?.id.toString()}
                onValueChange={(val) => {
                  const car = availableCars.find(c => c.id.toString() === val);
                  setCurrentAssignment({ ...currentAssignment, car });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select car" />
                </SelectTrigger>
                <SelectContent>
                  {availableCars.map(car => (
                    <SelectItem key={car.id} value={car.id.toString()}>
                      {car.name} ({car.number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentAssignment.car && (
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox
                    checked={currentAssignment.carLocked}
                    onCheckedChange={(checked) =>
                      setCurrentAssignment({ ...currentAssignment, carLocked: !!checked })
                    }
                  />
                  <Label className="text-sm text-gray-600">
                    Lock car (remove from pool for this date)
                  </Label>
                </div>
              )}
            </div>

            {/* Select Workers */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Select Workers *</Label>
                <span className="text-xs text-gray-500">
                  Clear ({currentAssignment.workers.length})
                </span>
              </div>

              {/* Tabs */}
              <div className="mt-2">
                <div className="flex border-b">
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${currentAssignment.activeTab === 'teams'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    onClick={() => setCurrentAssignment({ ...currentAssignment, activeTab: 'teams' })}
                  >
                    Team Selection
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${currentAssignment.activeTab === 'workers'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    onClick={() => setCurrentAssignment({ ...currentAssignment, activeTab: 'workers' })}
                  >
                    All Workers
                  </button>
                </div>

                {/* Tab Content */}
                <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2 mt-2">
                  {currentAssignment.activeTab === 'teams' ? (
                    /* Team Selection Tab */
                    <div className="space-y-2">
                      {/* Select All Teams Checkbox */}
                      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                        <Checkbox
                          checked={false} // You can implement logic for all teams selected
                          onCheckedChange={(checked) => {
                            // Implement select all teams logic
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">Select All Teams</span>
                      </div>

                      {/* Team Options */}
                      <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          checked={false} // Implement team selection logic
                          onCheckedChange={(checked) => {
                            // Implement team beta selection
                          }}
                        />
                        <span className="text-sm text-gray-900">team beta</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          checked={true} // This one is selected in your image
                          onCheckedChange={(checked) => {
                            // Implement team generation z 1 selection
                          }}
                        />
                        <span className="text-sm text-gray-900">team generation z 1</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          checked={false}
                          onCheckedChange={(checked) => {
                            // Implement Team beta selection
                          }}
                        />
                        <span className="text-sm text-gray-900">Team beta</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          checked={false}
                          onCheckedChange={(checked) => {
                            // Implement Team A selection
                          }}
                        />
                        <span className="text-sm text-gray-900">Team A</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          checked={false}
                          onCheckedChange={(checked) => {
                            // Implement ALpha beta selection
                          }}
                        />
                        <span className="text-sm text-gray-900">ALpha beta</span>
                      </div>
                    </div>
                  ) : (
                    /* All Workers Tab */
                    <div className="space-y-2">
                      {/* Select All Workers Checkbox */}
                      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                        <Checkbox
                          checked={currentAssignment.workers.length === availableWorkers.length && availableWorkers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCurrentAssignment({
                                ...currentAssignment,
                                workers: [...availableWorkers]
                              });
                            } else {
                              setCurrentAssignment({
                                ...currentAssignment,
                                workers: []
                              });
                            }
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">All Workers</span>
                      </div>

                      {/* Unselect All Checkbox */}
                      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                        <Checkbox
                          checked={currentAssignment.workers.length === 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCurrentAssignment({
                                ...currentAssignment,
                                workers: []
                              });
                            }
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">Unselect All</span>
                      </div>

                      {/* Individual Workers */}
                      {availableWorkers.map(worker => (
                        <div
                          key={worker.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={currentAssignment.workers.some((w: any) => w.id === worker.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCurrentAssignment({
                                    ...currentAssignment,
                                    workers: [...currentAssignment.workers, worker]
                                  });
                                } else {
                                  setCurrentAssignment({
                                    ...currentAssignment,
                                    workers: currentAssignment.workers.filter((w: any) => w.id !== worker.id)
                                  });
                                }
                              }}
                            />
                            <div>
                              <span className="text-sm text-gray-900">{worker.fullName}</span>
                              <div className="text-xs text-gray-500">worker</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">{worker.role}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {currentAssignment.workers.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox
                    checked={currentAssignment.workersLocked}
                    onCheckedChange={(checked) =>
                      setCurrentAssignment({ ...currentAssignment, workersLocked: !!checked })
                    }
                  />
                  <Label className="text-sm text-gray-600">
                    Lock workers (remove from pool for this date)
                  </Label>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Selected: {currentAssignment.workers.length} workers
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setCurrentAssignment({
                  site: null,
                  car: null,
                  workers: [],
                  workersLocked: true,
                  carLocked: true,
                  activeTab: 'workers',
                  assignmentDate: '',
                });
                setShowAddAssignment(false);
              }}>
                Cancel
              </Button>
              <Button onClick={addAssignment}>
                Add Assignment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finalize Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Assignments</DialogTitle>
            <DialogDescription>
              Review and confirm assignments for {selectedDate}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
              <h4 className="text-sm text-brand-700 mb-2">Assignment Summary</h4>
              <div className="space-y-1 text-xs text-brand-600">
                <p>• Date: <span className="font-medium">{selectedDate}</span></p>
                <p>• Assignments: <span className="font-medium">{assignments.length}</span></p>
                <p>• Workers Assigned: <span className="font-medium">
                  {assignments.reduce((sum, a) => sum + a.workers.length, 0)}
                </span></p>
                <p>• Workers on Day Off: <span className="font-medium">{workersOnDayOff.length}</span></p>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">Worker View Permissions</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {allowFullView
                      ? 'Workers can see all sites and all workers'
                      : 'Workers can only see their assigned site and team'}
                  </p>
                </div>
                <Switch
                  checked={allowFullView}
                  onCheckedChange={setAllowFullView}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={finalizeAssignments}>
                <Save className="w-4 h-4 mr-2" />
                Finalize & Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Assignments</DialogTitle>
            <DialogDescription>
              Choose the format and options for exporting assignments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
              <h4 className="text-sm text-brand-700 mb-2">Assignment Summary</h4>
              <div className="space-y-1 text-xs text-brand-600">
                <p>• Date: <span className="font-medium">{selectedDate}</span></p>
                <p>• Assignments: <span className="font-medium">{assignments.length}</span></p>
                <p>• Workers Assigned: <span className="font-medium">
                  {assignments.reduce((sum, a) => sum + a.workers.length, 0)}
                </span></p>
                <p>• Workers on Day Off: <span className="font-medium">{workersOnDayOff.length}</span></p>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">Export Format</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose the file format for the export
                  </p>
                </div>
                <Select
                  value="excel"
                  onValueChange={(val) => {
                    // Handle format change if needed
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                Cancel
              </Button>
              <Button onClick={exportProgram}>
                <Download className="w-4 h-4 mr-2" />
                Export Program
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}