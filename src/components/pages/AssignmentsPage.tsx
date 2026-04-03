'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Search, Trash2, Loader, Lock, Unlock, AlertCircle, GripVertical, Edit, Download, ChevronUp, ChevronDown, Eye, Power } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import { AssignmentExportDialog } from './AssignmentExportDialog';
import { WorkerAssignmentDetailsDialog } from './WorkerAssignmentDetailsDialog';

interface AssignmentsPageProps {
  userRole: string;
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
  isCompleted?: boolean;
}

interface Assignment {
  id: string;
  siteId: string;
  workerId: string;
  carId?: string;
  assignedDate: string;
  status: string;
  notes?: string;
  showAssignmentHistory?: boolean;
  createdAt: string;
  site: Site;
  worker: Worker;
  car?: Car;
}

export function AssignmentsPage({ userRole }: AssignmentsPageProps) {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allWorkers, setAllWorkers] = useState<Worker[]>([]);
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(''); // Empty string means show all assignments
  const [dialogAssignmentDate, setDialogAssignmentDate] = useState(''); // Separate date for the dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editingAssignments, setEditingAssignments] = useState<Assignment[]>([]); // Track all assignments being edited
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [viewAssignment, setViewAssignment] = useState<Assignment | null>(null);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [lockCar, setLockCar] = useState(false);
  const [lockWorkers, setLockWorkers] = useState(false);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [workersOnDayOff, setWorkersOnDayOff] = useState<string[]>([]);
  const [workersOnDayOffForDialog, setWorkersOnDayOffForDialog] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    siteId: '',
    workerId: '',
    carId: '',
    notes: '',
  });

  const canAssignWorker = (workerId: string, siteId: string, assignmentDate: string) => {
    const worker = allWorkers.find(w => w.id === workerId);
    if (!worker) return false;

    // If worker is not locked, they can always be assigned
    if (!worker.isLocked) return true;

    // If worker is locked, check if they're already assigned to this site/date
    const dateToCheck = new Date(assignmentDate);
    const startOfDay = new Date(dateToCheck.getFullYear(), dateToCheck.getMonth(), dateToCheck.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const existingAssignment = assignments.find(assignment => {
      const assignmentDateTime = new Date(assignment.assignedDate);
      return assignment.siteId === siteId &&
        assignment.workerId === workerId &&
        assignmentDateTime >= startOfDay &&
        assignmentDateTime < endOfDay;
    });

    return !!existingAssignment;
  };

  const canEdit = ['admin', 'site_manager'].includes(userRole);

  // Handle dialog close - reset all form data and states
  const handleDialogClose = (open: boolean) => {
    setIsCreateDialogOpen(open);

    // When opening for create, set assignment date to board date or today and fetch day-off for that date
    if (open && !isEditMode) {
      const date = selectedDate || new Date().toISOString().split('T')[0];
      setDialogAssignmentDate(date);
      fetchDailyProgramForDate(date).then(ids => setWorkersOnDayOffForDialog(ids));
    }

    // If dialog is being closed, reset all form data
    if (!open) {
      resetForm();
      setIsEditMode(false);
      setEditingAssignment(null);
      setEditingAssignments([]);
      setError('');
      setSelectedWorkers([]);
      setSelectedTeam('');
      setDialogAssignmentDate('');
      setWorkersOnDayOffForDialog([]);
      setFormData({
        siteId: '',
        workerId: '',
        carId: '',
        notes: '',
      });
    }
  };

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Refresh data when selected date changes
  useEffect(() => {
    if (selectedDate !== '') {
      fetchAllData();
    }
  }, [selectedDate]);

  // Fetch daily program when selected date changes
  useEffect(() => {
    fetchDailyProgram();
  }, [selectedDate]);

  // Update available workers when assignments or workers change
  useEffect(() => {
    updateAvailableResources();
  }, [assignments, allWorkers, selectedDate]);

  // Refetch day-off workers when assignment date changes in create dialog
  useEffect(() => {
    if (isCreateDialogOpen && !isEditMode && dialogAssignmentDate) {
      fetchDailyProgramForDate(dialogAssignmentDate).then(setWorkersOnDayOffForDialog);
    }
  }, [dialogAssignmentDate, isCreateDialogOpen, isEditMode]);

  const fetchDailyProgram = async () => {
    try {
      const dateParam = selectedDate || new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/daily-program?date=${dateParam}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch daily program');
      }

      const data = await response.json();
      setWorkersOnDayOff(data.workersOnDayOff || []);
    } catch (error) {
      console.error('Error fetching daily program:', error);
      setWorkersOnDayOff([]);
    }
  };

  const fetchDailyProgramForDate = async (date: string): Promise<string[]> => {
    try {
      const response = await fetch(`/api/daily-program?date=${date}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.workersOnDayOff || [];
    } catch {
      return [];
    }
  };

  const fetchAllData = async () => {
    try {
      setIsLoading(true);

      // Use by-site API as main data source
      const bySiteUrl = selectedDate
        ? `/api/assignments/by-site?date=${selectedDate}`
        : `/api/assignments/by-site`;

      const [bySiteRes, availableRes, carsRes, sitesRes, teamsRes, allWorkersRes] = await Promise.all([
        fetch(bySiteUrl), // Use by-site API instead of main assignments API
        fetch('/api/assignments/available?role=worker'), // Only fetch workers with worker role
        fetch('/api/cars'), // Fetch all cars to get accurate counts
        fetch('/api/sites'),
        fetch('/api/teams'),
        fetch('/api/workers?role=worker'), // Only fetch users with worker role
      ]);

      if (!bySiteRes.ok || !availableRes.ok || !carsRes.ok || !sitesRes.ok || !teamsRes.ok || !allWorkersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const bySiteData = await bySiteRes.json();
      const availableData = await availableRes.json();
      const carsData = await carsRes.json();
      const sitesData = await sitesRes.json();
      const teamsData = await teamsRes.json();
      const allWorkersData = await allWorkersRes.json();

      // Convert by-site data to flat assignments array for compatibility
      const flatAssignments: Assignment[] = [];
      (bySiteData.assignments || []).forEach((siteData: any) => {
        siteData.workers.forEach((worker: any) => {
          flatAssignments.push({
            id: worker.id,
            siteId: siteData.id,
            workerId: worker.workerId,
            carId: worker.car?.id || null,
            assignedDate: worker.assignedDate,
            status: worker.status,
            notes: worker.notes,
            showAssignmentHistory: worker.showAssignmentHistory ?? false,
            createdAt: worker.createdAt,
            site: {
              id: siteData.id,
              name: siteData.name,
              address: siteData.address,
              city: siteData.city,
              status: siteData.siteStatus || 'active',
              isCompleted: siteData.isCompleted || false
            },
            worker: {
              id: worker.workerId,
              fullName: worker.workerName,
              email: worker.workerEmail,
              phone: worker.workerPhone,
              role: worker.workerRole,
              isLocked: worker.workerIsLocked
            },
            car: worker.car ? {
              id: worker.car.id,
              name: worker.car.name,
              number: worker.car.number,
              color: worker.car.color,
              model: worker.car.model,
              status: worker.car.status || 'active',
              isLocked: worker.car.isLocked || false
            } : undefined
          });
        });
      });

      // Set all the state with fresh data
      setAssignments(flatAssignments);
      // Use all workers data for accurate counts, but available workers for the pool
      setAllWorkers(allWorkersData.workers || []);
      setAvailableWorkers(availableData.workers || []);
      setAllCars(carsData.cars || []); // This will include all cars with their lock status
      setAllSites(sitesData.sites || []);
      setAllTeams(teamsData.teams || []);

      // Enhanced logging for debugging counts
      const availableCarsCount = (carsData.cars || []).filter((c: any) => c.status === 'active' && !c.isLocked).length;
      const totalCarsCount = (carsData.cars || []).length;
      const availableWorkersCount = (availableData.workers || []).length;
      const totalWorkersCount = (allWorkersData.workers || []).length;
      const lockedWorkersCount = (allWorkersData.workers || []).filter((w: any) => w.isLocked).length;

      console.log('=== ASSIGNMENTS PAGE DATA SUMMARY ===');
      console.log('Assignments:', {
        total: flatAssignments.length,
        forSelectedDate: selectedDate ? flatAssignments.filter(a => {
          const assignmentDate = new Date(a.assignedDate).toISOString().split('T')[0];
          return assignmentDate === selectedDate;
        }).length : 'N/A (no date selected)'
      });
      console.log('Cars:', {
        total: totalCarsCount,
        active: (carsData.cars || []).filter((c: any) => c.status === 'active').length,
        locked: (carsData.cars || []).filter((c: any) => c.isLocked).length,
        available: availableCarsCount
      });
      console.log('Workers:', {
        total: totalWorkersCount,
        locked: lockedWorkersCount,
        unlocked: totalWorkersCount - lockedWorkersCount,
        available: availableWorkersCount
      });
      console.log('Sites:', (sitesData.sites || []).length);
      console.log('Teams:', (teamsData.teams || []).length);
      console.log('=====================================');

    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error(t('assignments.failedToLoadData'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateAvailableResources = () => {
    // Only check if worker is locked
    // Don't check assignments - workers can be assigned to multiple sites
    const lockedWorkerIds = allWorkers
      .filter(w => w.isLocked)
      .map(w => w.id);

    // Available workers: only those who are NOT locked
    const available = allWorkers.filter(w =>
      !lockedWorkerIds.includes(w.id)
    );

    setAvailableWorkers(available);
  };

  const getAvailableCars = () => {
    // Filter cars by: active status AND not locked
    const availableCars = allCars.filter((car: Car) =>
      car.status === 'active' &&
      !car.isLocked
    );

    console.log('Available cars calculation:', {
      totalCars: allCars.length,
      activeCars: allCars.filter(c => c.status === 'active').length,
      unlockedCars: allCars.filter(c => !c.isLocked).length,
      availableCars: availableCars.length,
      carDetails: allCars.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        isLocked: c.isLocked
      }))
    });

    return availableCars;
  };

  const getAvailableWorkersCount = () => {
    // Use the availableWorkers state which is already filtered by the API
    console.log('Available workers calculation:', {
      availableWorkers: availableWorkers.length,
      allWorkers: allWorkers.length,
      lockedWorkers: allWorkers.filter(w => w.isLocked).length,
      unlockedWorkers: allWorkers.filter(w => !w.isLocked).length,
    });

    return availableWorkers.length;
  };

  const getAssignmentsCount = () => {
    let filteredAssignments;
    if (!selectedDate) {
      filteredAssignments = assignments;
    } else {
      filteredAssignments = assignments.filter(assignment => {
        const assignmentDate = new Date(assignment.assignedDate).toISOString().split('T')[0];
        return assignmentDate === selectedDate;
      });
    }

    // Count unique assignments by site (not individual worker assignments)
    const uniqueSiteIds = new Set(filteredAssignments.map(assignment => assignment.siteId));
    const count = uniqueSiteIds.size;

    console.log('Assignments count calculation:', {
      selectedDate,
      totalWorkerAssignments: assignments.length,
      filteredWorkerAssignments: filteredAssignments.length,
      uniqueAssignments: count,
      uniqueSites: Array.from(uniqueSiteIds)
    });

    return count;
  };

  const getSiteAssignments = (siteId: string) => {
    return assignments.filter(a => {
      // If no date selected, show all assignments for this site
      if (!selectedDate) {
        return a.siteId === siteId;
      }
      // If date selected, filter by date and site
      const assignmentDate = new Date(a.assignedDate).toISOString().split('T')[0];
      return a.siteId === siteId && assignmentDate === selectedDate;
    });
  };

  const isCardLocked = (siteAssignments: Assignment[]) => {
    // Card is locked only if ANY worker in it is locked
    return siteAssignments.some(a => {
      const worker = allWorkers.find(w => w.id === a.workerId);
      return worker?.isLocked;
    });
  };

  const isSiteCompleted = (site: Site) => {
    return site.status === 'completed';
  };

  const canEditSite = (site: Site) => {
    return canEdit && !isSiteCompleted(site);
  };

  const toggleExpandedSite = (siteId: string) => {
    setExpandedSites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(siteId)) {
        newSet.delete(siteId);
      } else {
        newSet.add(siteId);
      }
      return newSet;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Memoized available sites that updates when dialog assignment date changes
  const availableSites = useMemo(() => {
    // Use the dialog assignment date for filtering, not the background selected date
    const dateToCheck = dialogAssignmentDate || selectedDate;

    console.log('🔍 Site filtering debug:', {
      dialogAssignmentDate,
      selectedDate,
      dateToCheck,
      totalSites: allSites.length,
      totalAssignments: assignments.length
    });

    // Get sites that already have assignments for the specified date (or any date if no date selected)
    let sitesWithAssignments;

    if (!dateToCheck) {
      // If no date selected, filter out sites that have ANY assignments
      sitesWithAssignments = [...new Set(assignments.map(a => a.siteId))];
      console.log('No date selected, filtering sites with any assignments:', sitesWithAssignments);
    } else {
      // If date selected, filter out sites that have assignments for this specific date
      sitesWithAssignments = assignments
        .filter(a => {
          const assignmentDate = new Date(a.assignedDate).toISOString().split('T')[0];
          const matches = assignmentDate === dateToCheck;
          if (matches) {
            console.log('Found assignment for date:', { assignmentDate, dateToCheck, siteId: a.siteId, siteName: a.site?.name });
          }
          return matches;
        })
        .map(a => a.siteId);
      console.log('Sites with assignments for date:', sitesWithAssignments);
    }

    // Return only sites without assignments AND not completed
    const filteredSites = allSites.filter(site =>
      !sitesWithAssignments.includes(site.id) && !isSiteCompleted(site)
    );

    console.log('Available sites after filtering (excluding completed):', filteredSites.map(s => s.name));

    return filteredSites;
  }, [allSites, assignments, dialogAssignmentDate, selectedDate]);

  const getAvailableSites = () => {
    return availableSites;
  };

  const handleCreateAssignment = async () => {
    try {
      setError('');
      if (!dialogAssignmentDate || !formData.siteId || selectedWorkers.length === 0) {
        setError(t('assignments.assignmentRequired'));
        return;
      }

      setIsLoading(true);

      // Filter out any invalid worker IDs before submission
      const validWorkerIds = selectedWorkers.filter(workerId =>
        allWorkers.some(worker => worker.id === workerId && worker.role === 'worker')
      );

      if (validWorkerIds.length === 0) {
        setError(t('assignments.noValidWorkers'));
        setIsLoading(false);
        return;
      }

      if (validWorkerIds.length !== selectedWorkers.length) {
        console.warn('Some selected workers are invalid and will be filtered out:', {
          selected: selectedWorkers,
          valid: validWorkerIds,
          invalid: selectedWorkers.filter(id => !validWorkerIds.includes(id))
        });
      }

      if (isEditMode && editingAssignment) {
        // UPDATE MODE: Handle assignment updates with smart logic
        const originalWorkerIds = editingAssignments.map(a => a.workerId);
        const originalAssignmentIds = editingAssignments.map(a => a.id);

        // Check if we're updating to exactly one worker and it's the same as the original single worker
        if (validWorkerIds.length === 1 && originalWorkerIds.length === 1 && validWorkerIds[0] === originalWorkerIds[0]) {
          // Single worker to same single worker: Update existing assignment using PUT
          const response = await fetch(`/api/assignments/${editingAssignment.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              siteId: formData.siteId,
              workerId: validWorkerIds[0],
              carId: formData.carId || null,
              assignedDate: dialogAssignmentDate,
              status: 'active',
              notes: formData.notes || null,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update assignment');
          }

          await fetchAllData();
          setIsCreateDialogOpen(false);
          resetForm();

          // Force a refresh of counts after successful operation
          setTimeout(() => {
            console.log('Post-operation counts check:', {
              assignments: getAssignmentsCount(),
              availableWorkers: getAvailableWorkersCount(),
              availableCars: getAvailableCars().length
            });
          }, 100);

          toast.success(t('assignments.updateSuccess'));
        } else {
          // ANY other case (multiple workers, different worker, or adding workers): Use bulk update API
          console.log('Using BULK UPDATE API:', {
            originalWorkers: originalWorkerIds.length,
            newWorkers: validWorkerIds.length,
            originalAssignments: originalAssignmentIds.length,
            validWorkerIds: validWorkerIds,
            originalWorkerIds: originalWorkerIds,
            reason: validWorkerIds.length > 1 ? 'Multiple workers selected' :
              originalWorkerIds.length > 1 ? 'Originally had multiple workers' :
                'Different worker selected'
          });

          const response = await fetch('/api/assignments/bulk-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              siteId: formData.siteId,
              workerIds: validWorkerIds, // Array of all selected workers
              carId: formData.carId || null,
              assignedDate: dialogAssignmentDate,
              notes: formData.notes || null,
              // originalAssignmentIds is now optional - API will auto-detect if not provided
              originalAssignmentIds: originalAssignmentIds,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update assignments');
          }

          const result = await response.json();
          const assignmentCount = result.createdCount || validWorkerIds.length;

          await fetchAllData();
          setIsCreateDialogOpen(false);
          resetForm();

          // Force a refresh of counts after successful operation
          setTimeout(() => {
            console.log('Post-bulk-update counts check:', {
              assignments: getAssignmentsCount(),
              availableWorkers: getAvailableWorkersCount(),
              availableCars: getAvailableCars().length
            });
          }, 100);

          toast.success(t('assignments.updateSuccess'));
        }
      } else {
        // CREATE MODE: Create new assignments
        const response = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteId: formData.siteId,
            workerIds: validWorkerIds,
            carId: formData.carId || null,
            assignedDate: dialogAssignmentDate,
            status: 'active',
            notes: formData.notes || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create assignment');
        }

        const result = await response.json();
        const assignmentCount = result.count || 1;

        // Lock car if checkbox is checked
        if (lockCar && formData.carId) {
          await fetch(`/api/cars/${formData.carId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isLocked: true }),
          });
        }

        // Lock workers if checkbox is checked
        if (lockWorkers) {
          for (const workerId of validWorkerIds) {
            await fetch(`/api/workers/${workerId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isLocked: true }),
            });
          }
        }

        await fetchAllData();
        setIsCreateDialogOpen(false);
        resetForm();

        // Force a refresh of counts after successful operation
        setTimeout(() => {
          console.log('Post-create counts check:', {
            assignments: getAssignmentsCount(),
            availableWorkers: getAvailableWorkersCount(),
            availableCars: getAvailableCars().length
          });
        }, 100);

        toast.success(t('assignments.createSuccess'));
      }
    } catch (err: any) {
      console.error('Assignment operation error:', err);

      // Parse the error response to provide better user feedback
      let errorMessage = err.message || 'Failed to process assignment';

      // Check if it's a locked workers error
      if (errorMessage.includes('locked and cannot be assigned')) {
        // Extract worker names from the error message
        const match = errorMessage.match(/The following workers are locked and cannot be assigned: ([^.]+)\./);
        if (match) {
          const lockedWorkerNames = match[1];
          errorMessage = `Cannot assign locked workers: ${lockedWorkerNames}`;

          // Add helpful suggestion
          setError(`${errorMessage}\n\nSuggestions:\n• Unlock the workers first, or\n• Remove them from selection and choose different workers`);
          toast.error(`${errorMessage}. Please unlock them first or choose different workers.`);
        } else {
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } else if (errorMessage.includes('not found or do not have worker role')) {
        setError(`${errorMessage}\n\nPlease refresh the page and try again.`);
        toast.error(t('assignments.selectWorkersRefresh'));
      } else {
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      siteId: '',
      workerId: '',
      carId: '',
      notes: '',
    });
    setError('');
    setSelectedWorkers([]);
    setSelectedTeam('');
    setLockCar(false);
    setLockWorkers(false);
    setIsEditMode(false);
    setEditingAssignment(null);
    setEditingAssignments([]); // Clear all editing assignments
    setDialogAssignmentDate(''); // Clear dialog assignment date
  };

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeam(teamId);
    if (teamId === 'all') {
      // Select all available workers
      setSelectedWorkers(availableWorkers.map(w => w.id));
    } else if (teamId === 'none') {
      // Unselect all workers
      setSelectedWorkers([]);
    } else {
      const team = allTeams.find(t => t.id === teamId);
      if (team) {
        // Add team lead and all members, removing duplicates
        const workerIds = [team.teamLeadId, ...team.memberIds];
        const uniqueWorkerIds = [...new Set(workerIds)];
        setSelectedWorkers(uniqueWorkerIds);
      }
    }
  };

  const getFilteredWorkers = () => {
    // In create/edit dialog, use day-off list for the assignment date; otherwise use board's list
    const dayOffIds = isCreateDialogOpen ? workersOnDayOffForDialog : workersOnDayOff;
    const excludeDayOff = (list: Worker[]) =>
      list.filter(w => !dayOffIds.includes(w.id));

    if (selectedTeam === 'all') {
      return excludeDayOff(availableWorkers);
    } else if (selectedTeam) {
      const team = allTeams.find(t => t.id === selectedTeam);
      if (team) {
        const teamMemberIds = [team.teamLeadId, ...team.memberIds];
        return excludeDayOff(availableWorkers.filter(w => teamMemberIds.includes(w.id)));
      }
    }
    return excludeDayOff(availableWorkers);
  };

  const handleWorkerToggle = (workerId: string) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
    setSelectedTeam(''); // Clear team selection when manually selecting workers
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm(t('assignments.deleteConfirm'))) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete assignment');

      const data = await response.json();

      await fetchAllData();

      // Show appropriate success message
      if (data.workerUnlocked) {
        toast.success(t('assignments.assignmentDeletedUnlocked', { name: data.workerName }));
      } else {
        toast.success(t('assignments.deleteSuccess'));
      }
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToDelete'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAssignment = (assignmentOrAssignments: Assignment | Assignment[]) => {
    // Handle both single assignment and array of assignments
    const assignments = Array.isArray(assignmentOrAssignments) ? assignmentOrAssignments : [assignmentOrAssignments];
    const firstAssignment = assignments[0];

    setEditingAssignment(firstAssignment);
    setEditingAssignments(assignments); // Store all assignments being edited
    setIsEditMode(true);

    // Pre-populate form data with existing assignment
    setFormData({
      siteId: firstAssignment.siteId,
      workerId: '', // Will be handled by selectedWorkers
      carId: firstAssignment.carId || '',
      notes: firstAssignment.notes || '',
    });

    // Pre-select ALL workers from the assignments, but only if they still exist and have worker role
    const allWorkerIds = assignments.map(assignment => assignment.workerId);
    const validWorkerIds = allWorkerIds.filter(workerId =>
      allWorkers.some(worker => worker.id === workerId && worker.role === 'worker')
    );

    // Log any invalid worker IDs for debugging
    const invalidWorkerIds = allWorkerIds.filter(workerId =>
      !allWorkers.some(worker => worker.id === workerId && worker.role === 'worker')
    );

    if (invalidWorkerIds.length > 0) {
      console.warn('Found invalid worker IDs in assignments:', invalidWorkerIds);
      console.log('Available workers:', allWorkers.map(w => ({ id: w.id, name: w.fullName, role: w.role })));

      // Show a user-friendly error message
      const invalidCount = invalidWorkerIds.length;
      const validCount = validWorkerIds.length;

      if (validCount === 0) {
        setError(t('assignments.workersNoLongerAvailable', { count: invalidCount }));
      } else {
        toast.error(t('assignments.someWorkersNoLongerAvailable', { invalid: invalidCount, valid: validCount }));
      }
    }

    setSelectedWorkers(validWorkerIds);

    // Set the dialog assignment date (not the background selected date)
    const assignmentDate = new Date(firstAssignment.assignedDate).toISOString().split('T')[0];
    setDialogAssignmentDate(assignmentDate);
    fetchDailyProgramForDate(assignmentDate).then(setWorkersOnDayOffForDialog);

    setIsCreateDialogOpen(true);
  };

  const handleDeleteSiteCard = async (siteId: string, siteAssignments: Assignment[]) => {
    if (!confirm(t('assignments.deleteSiteConfirm', { count: siteAssignments.length }))) return;

    try {
      setIsLoading(true);

      // Use bulk delete API to delete all assignments for this site at once
      const assignmentIds = siteAssignments.map(assignment => assignment.id);

      const response = await fetch('/api/assignments/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentIds: assignmentIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete assignments');
      }

      const result = await response.json();

      await fetchAllData();
      toast.success(t('assignments.assignmentsDeleted', { message: result.message, deleted: result.deletedCount, unlocked: result.unlockedWorkers }));
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToDeleteSite'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockWorker = async (workerId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workers/${workerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: true }),
      });

      if (!response.ok) throw new Error('Failed to lock worker');

      // Remove from available workers immediately
      setAvailableWorkers(prev => prev.filter(w => w.id !== workerId));

      // Update worker in allWorkers
      setAllWorkers(prev => prev.map(w =>
        w.id === workerId ? { ...w, isLocked: true } : w
      ));

      // Update worker lock status in assignments as well
      setAssignments(prev => prev.map(assignment =>
        assignment.workerId === workerId
          ? { ...assignment, worker: { ...assignment.worker, isLocked: true } }
          : assignment
      ));

      toast.success(t('assignments.workerLockedSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToLockWorker'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockWorker = async (workerId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workers/${workerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: false }),
      });

      if (!response.ok) throw new Error('Failed to unlock worker');

      // Add back to available workers
      const worker = allWorkers.find(w => w.id === workerId);
      if (worker) {
        setAvailableWorkers(prev => [...prev, { ...worker, isLocked: false }]);
      }

      // Update worker in allWorkers
      setAllWorkers(prev => prev.map(w =>
        w.id === workerId ? { ...w, isLocked: false } : w
      ));

      // Update worker lock status in assignments as well
      setAssignments(prev => prev.map(assignment =>
        assignment.workerId === workerId
          ? { ...assignment, worker: { ...assignment.worker, isLocked: false } }
          : assignment
      ));

      toast.success(t('assignments.workerUnlockedSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToUnlockWorker'));
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk lock/unlock functions
  const handleBulkLockWorkers = async (workerIds: string[], isLocked: boolean) => {
    // Remove duplicates and filter out invalid IDs
    const uniqueWorkerIds = [...new Set(workerIds)].filter(id => id && typeof id === 'string' && id.trim() !== '');

    if (uniqueWorkerIds.length === 0) {
      toast.error(t('assignments.noValidWorkersToUpdate'));
      return;
    }

    // Validate that all worker IDs exist in our local data
    const validWorkerIds = uniqueWorkerIds.filter(id => allWorkers.some(w => w.id === id));
    const invalidWorkerIds = uniqueWorkerIds.filter(id => !allWorkers.some(w => w.id === id));

    if (invalidWorkerIds.length > 0) {
      console.warn('Invalid worker IDs found:', invalidWorkerIds);
      toast.error(t('assignments.someWorkersNotFound', { count: invalidWorkerIds.length }));
      return;
    }

    if (validWorkerIds.length === 0) {
      toast.error(t('assignments.noValidWorkersToUpdate'));
      return;
    }

    console.log(`Attempting to ${isLocked ? 'lock' : 'unlock'} ${validWorkerIds.length} workers:`, validWorkerIds);

    try {
      setIsLoading(true);
      const response = await fetch('/api/workers/bulk-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerIds: validWorkerIds,
          isLocked,
          // Don't send updatedByUserId for now since we don't have proper auth context
          // updatedByUserId: 'system' // This was causing the foreign key error
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Bulk lock API error:', data);
        throw new Error(data.error || `Failed to ${isLocked ? 'lock' : 'unlock'} workers`);
      }

      const result = await response.json();

      // Update local state for all affected workers
      setAllWorkers(prev => prev.map(w =>
        validWorkerIds.includes(w.id) ? { ...w, isLocked } : w
      ));

      // Update assignments state
      setAssignments(prev => prev.map(assignment =>
        validWorkerIds.includes(assignment.workerId)
          ? { ...assignment, worker: { ...assignment.worker, isLocked } }
          : assignment
      ));

      // Update available workers
      if (isLocked) {
        // Remove locked workers from available pool
        setAvailableWorkers(prev => prev.filter(w => !validWorkerIds.includes(w.id)));
      } else {
        // Add unlocked workers back to available pool
        const unlockedWorkers = allWorkers.filter(w => validWorkerIds.includes(w.id));
        setAvailableWorkers(prev => {
          const existingIds = prev.map(w => w.id);
          const newWorkers = unlockedWorkers
            .filter(w => !existingIds.includes(w.id))
            .map(w => ({ ...w, isLocked: false }));
          return [...prev, ...newWorkers];
        });
      }

      toast.success(result.message);
    } catch (err: any) {
      console.error('Bulk lock error:', err);
      toast.error(err.message || t('assignments.failedToLoadData'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockAllWorkers = async () => {
    // Only lock workers that are currently unlocked
    const unlockedWorkerIds = allWorkers.filter(w => !w.isLocked).map(w => w.id);
    if (unlockedWorkerIds.length === 0) {
      toast.info(t('assignments.allWorkersLocked'));
      return;
    }
    await handleBulkLockWorkers(unlockedWorkerIds, true);
  };

  const handleUnlockAllWorkers = async () => {
    // Only unlock workers that are currently locked
    const lockedWorkerIds = allWorkers.filter(w => w.isLocked).map(w => w.id);
    if (lockedWorkerIds.length === 0) {
      toast.info(t('assignments.allWorkersUnlocked'));
      return;
    }
    await handleBulkLockWorkers(lockedWorkerIds, false);
  };

  const handleLockCar = async (carId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: true }),
      });

      if (!response.ok) throw new Error('Failed to lock car');

      setAllCars(prev => prev.map(c =>
        c.id === carId ? { ...c, isLocked: true } : c
      ));

      toast.success(t('assignments.carLockedSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToLockCar'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockCar = async (carId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: false }),
      });

      if (!response.ok) throw new Error('Failed to unlock car');

      setAllCars(prev => prev.map(c =>
        c.id === carId ? { ...c, isLocked: false } : c
      ));

      toast.success(t('assignments.carUnlockedSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToUnlockCar'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDayOff = async (workerId: string) => {
    try {
      setIsLoading(true);
      const dateParam = selectedDate || new Date().toISOString().split('T')[0];
      
      const response = await fetch('/api/daily-program/toggle-day-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workerId,
          date: dateParam
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle day off');
      }

      const data = await response.json();
      
      // Update local state
      if (data.isOnDayOff) {
        setWorkersOnDayOff(prev => [...prev, workerId]);
        toast.success(t('assignments.workerMarkedDayOff'));
      } else {
        setWorkersOnDayOff(prev => prev.filter(id => id !== workerId));
        toast.success(t('assignments.workerNowAvailable'));
      }

      // Refresh data to update available workers
      await fetchAllData();
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToLoadData'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAllDayOff = async () => {
    try {
      // Get all workers who are not assigned for the selected date
      const unassignedWorkers = availableWorkers.filter(worker => {
        // Check if worker has any assignments for the selected date
        const hasAssignment = assignments.some(assignment => {
          if (!selectedDate) {
            return assignment.workerId === worker.id;
          }
          const assignmentDate = new Date(assignment.assignedDate).toISOString().split('T')[0];
          return assignment.workerId === worker.id && assignmentDate === selectedDate;
        });
        // Only include workers who are not assigned and not already on day-off
        return !hasAssignment && !workersOnDayOff.includes(worker.id);
      });

      if (unassignedWorkers.length === 0) {
        toast.info(t('assignments.noUnassignedWorkers'));
        return;
      }

      const confirmed = confirm(
        t('assignments.markDayOffConfirm', { count: unassignedWorkers.length, date: selectedDate || t('common.today') })
      );

      if (!confirmed) return;

      setIsLoading(true);
      const dateParam = selectedDate || new Date().toISOString().split('T')[0];

      // Mark all unassigned workers as day off
      const promises = unassignedWorkers.map(worker =>
        fetch('/api/daily-program/toggle-day-off', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            workerId: worker.id,
            date: dateParam
          }),
        })
      );

      const results = await Promise.all(promises);
      
      // Check if all requests were successful
      const failedCount = results.filter(r => !r.ok).length;
      
      if (failedCount > 0) {
        toast.error(t('assignments.failedMarkDayOff', { count: failedCount }));
      } else {
        toast.success(t('assignments.workersMarkedDayOff', { count: unassignedWorkers.length }));
      }

      // Refresh data
      await fetchAllData();
      await fetchDailyProgram();
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToLoadData'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSites = allSites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [draggedWorker, setDraggedWorker] = useState<Worker | null>(null);
  const [dragOverSite, setDragOverSite] = useState<string | null>(null);

  const handleDragStart = (worker: Worker) => {
    setDraggedWorker(worker);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (siteId: string) => {
    if (draggedWorker && canEdit) {
      // Check if site is completed
      const site = allSites.find(s => s.id === siteId);
      if (site && !isSiteCompleted(site)) {
        setDragOverSite(siteId);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the card
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverSite(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedWorker(null);
    setDragOverSite(null);
  };

  const handleDropOnSite = async (siteId: string) => {
    if (!draggedWorker || !canEdit) {
      setDraggedWorker(null);
      return;
    }

    // Check if site is completed
    const site = allSites.find(s => s.id === siteId);
    if (site && isSiteCompleted(site)) {
      toast.error(t('assignments.cannotAssignCompleted'));
      setDraggedWorker(null);
      return;
    }

    // Check if worker is already assigned to this site on the selected date
    const existingAssignment = assignments.find(assignment => {
      const assignmentDate = selectedDate
        ? new Date(assignment.assignedDate).toISOString().split('T')[0]
        : null;

      return assignment.siteId === siteId &&
        assignment.workerId === draggedWorker.id &&
        (selectedDate ? assignmentDate === selectedDate : true);
    });

    if (existingAssignment) {
      toast.info(t('assignments.alreadyAssigned', { name: draggedWorker.fullName, dateSuffix: selectedDate ? t('assignments.onThisDate') : '' }));
      setDraggedWorker(null);
      return;
    }

    try {
      setIsLoading(true);

      // Use the current selected date or today's date
      const assignmentDate = selectedDate || new Date().toISOString().split('T')[0];

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          workerIds: [draggedWorker.id], // API expects array
          carId: null,
          assignedDate: assignmentDate,
          status: 'active',
          notes: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create assignment');
      }

      const result = await response.json();

      // Refresh data to get updated assignments
      await fetchAllData();

      toast.success(t('assignments.assignedSuccess', { name: draggedWorker.fullName, site: allSites.find(s => s.id === siteId)?.name || 'site' }));
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToAssignWorker'));
    } finally {
      setIsLoading(false);
      setDraggedWorker(null);
    }
  };

  if (isLoading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 sm:p-4 lg:p-6">
      {/* Header with buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="hidden sm:block"></div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsExportDialogOpen(true)}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            <Download className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">{t('assignments.exportReport')}</span>
            <span className="xs:hidden">{t('assignments.export')}</span>
          </Button>
          <Button
            variant="outline"
            onClick={fetchAllData}
            disabled={isLoading}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            {isLoading ? <Loader className="w-4 h-4 mr-1 sm:mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-1 sm:mr-2" />}
            <span className="hidden xs:inline">{t('assignments.refreshData')}</span>
            <span className="xs:hidden">{t('assignments.refresh')}</span>
          </Button>
          {/* {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={handleLockAllWorkers}
                disabled={isLoading || allWorkers.filter(w => !w.isLocked).length === 0}
                className="text-red-600 hover:bg-red-50 border-red-200"
              >
                <Lock className="w-4 h-4 mr-2" />
                {t('assignments.lockAll')} Workers
              </Button>
              <Button
                variant="outline"
                onClick={handleUnlockAllWorkers}
                disabled={isLoading || allWorkers.filter(w => w.isLocked).length === 0}
                className="text-green-600 hover:bg-green-50 border-green-200"
              >
                <Unlock className="w-4 h-4 mr-2" />
                {t('assignments.unlockAll')} Workers
              </Button>
            </>
          )} */}
          {canEdit && (
            <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button className="bg-brand-gradient hover:shadow-md text-white font-medium flex-1 sm:flex-none text-xs sm:text-sm">
                  <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">{t('assignments.addAssignment')}</span>
                  <span className="xs:hidden">{t('assignments.createAssignment')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-2">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">{isEditMode ? t('assignments.editAssignment') : t('assignments.createNewAssignment')}</DialogTitle>
                </DialogHeader>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4 mt-4">
                  {/* Date and Site Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">{t('assignments.assignmentDate')}</Label>
                      <Input
                        type="date"
                        value={dialogAssignmentDate}
                        onChange={(e) => setDialogAssignmentDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">{t('assignments.constructionSite')} *</Label>
                      {isEditMode ? (
                        <Input
                          value={editingAssignment?.site?.name || ''}
                          disabled
                          className="bg-gray-100 text-sm"
                        />
                      ) : (
                        <Select value={formData.siteId} onValueChange={(value) => setFormData(prev => ({ ...prev, siteId: value }))}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder={t('assignments.selectSite')} />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableSites().map(site => (
                              <SelectItem key={site.id} value={site.id} className="text-sm">
                                {site.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Car Selection */}
                  <div>
                    <Label className="text-sm">{t('assignments.selectCar')}</Label>
                    <Select value={formData.carId || "none"} onValueChange={(value) => setFormData(prev => ({ ...prev, carId: value === "none" ? "" : value }))}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder={t('assignments.selectCarOptional')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-sm">
                          {t('assignments.noCar')}
                        </SelectItem>
                        {getAvailableCars().map(car => (
                          <SelectItem key={car.id} value={car.id} className="text-sm">
                            {car.name} - {car.number} ({car.color})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lock Car Checkbox - Only show in create mode */}
                  {!isEditMode && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="lockCar"
                        checked={lockCar}
                        onChange={(e) => setLockCar(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <Label htmlFor="lockCar" className="cursor-pointer text-sm">
                        {t('assignments.lockCarAfterAssign')}
                      </Label>
                    </div>
                  )}

                  {/* Workers Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm">{t('assignments.selectWorkers')}</Label>
                      <button
                        onClick={() => setSelectedWorkers([])}
                        className="text-xs sm:text-sm text-brand-600 hover:text-brand-700 font-medium"
                      >
                        {t('assignments.clear')} ({selectedWorkers.length})
                      </button>
                    </div>

                    {/* Locked Workers Warning */}
                    {(() => {
                      const selectedLockedWorkers = selectedWorkers
                        .map(id => allWorkers.find(w => w.id === id))
                        .filter(w => w && w.isLocked);

                      if (selectedLockedWorkers.length > 0) {
                        return (
                          <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              {t('assignments.lockedWorkersWarning', { count: selectedLockedWorkers.length })}: {selectedLockedWorkers.map(w => w!.fullName).join(', ')}
                              <br />
                              <span className="text-xs">{t('assignments.lockedWorkersHint')}</span>
                            </AlertDescription>
                          </Alert>
                        );
                      }
                      return null;
                    })()}

                    {/* Team Selector */}
                    <div className="mb-4">
                      <Select value={selectedTeam} onValueChange={handleTeamSelect}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder={isEditMode ? t('assignments.addTeamMembers') : t('assignments.selectTeam')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-sm">{t('assignments.allWorkers')}</SelectItem>
                          <SelectItem value="none" className="text-sm">{t('assignments.unselectAll')}</SelectItem>
                          {allTeams
                            .filter(team => team.status === 'active') // Only show active teams
                            .map(team => (
                              <SelectItem key={team.id} value={team.id} className="text-sm">
                                {team.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Worker Search */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder={t('assignments.searchWorkers')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 text-sm"
                      />
                    </div>

                    {/* Workers List */}
                    <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {isEditMode ? (
                        // Edit mode: Show current workers first (with blue background), then other workers
                        <>
                          {/* Show all current workers first with special styling */}
                          {selectedWorkers.map(workerId => {
                            const worker = allWorkers.find(w => w.id === workerId);
                            if (!worker || !worker.fullName.toLowerCase().includes(searchQuery.toLowerCase())) return null;

                            return (
                              <div
                                key={workerId}
                                className={`flex items-center gap-3 p-2 sm:p-3 border rounded-lg cursor-pointer ${worker.isLocked
                                  ? 'border-red-300 bg-red-50 hover:bg-red-100'
                                  : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                                  }`}
                                onClick={() => handleWorkerToggle(workerId)}
                              >
                                <input
                                  type="checkbox"
                                  checked={true}
                                  onChange={() => { }}
                                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900 text-sm truncate">{worker.fullName}</p>
                                    {worker.isLocked && <Lock className="w-3 h-3 text-red-500" />}
                                  </div>
                                  <p className="text-xs text-gray-500">{worker.role}</p>
                                </div>
                                <span className={`text-xs font-medium hidden sm:inline ${worker.isLocked ? 'text-red-600' : 'text-blue-600'
                                  }`}>
                                  {worker.isLocked ? t('assignments.lockedWorker') : t('assignments.currentWorker')}
                                </span>
                              </div>
                            );
                          })}

                          {/* Show other available workers */}
                          {getFilteredWorkers()
                            .filter(w => !selectedWorkers.includes(w.id) && w.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(worker => (
                              <div
                                key={worker.id}
                                className="flex items-center gap-3 p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleWorkerToggle(worker.id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedWorkers.includes(worker.id)}
                                  onChange={() => { }}
                                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 text-sm truncate">{worker.fullName}</p>
                                  <p className="text-xs text-gray-500">{worker.role}</p>
                                </div>
                              </div>
                            ))}
                        </>
                      ) : (
                        // Create mode: Show all available workers
                        getFilteredWorkers()
                          .filter(w => w.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map(worker => (
                            <div
                              key={worker.id}
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${worker.isLocked
                                ? 'border-red-200 bg-red-50 hover:bg-red-100'
                                : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              onClick={() => handleWorkerToggle(worker.id)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedWorkers.includes(worker.id)}
                                onChange={() => { }}
                                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">{worker.fullName}</p>
                                  {worker.isLocked && <Lock className="w-3 h-3 text-red-500" />}
                                </div>
                                <p className="text-xs text-gray-500">{worker.role}</p>
                              </div>
                              {worker.isLocked && (
                                <span className="text-xs text-red-600 font-medium">{t('assignments.locked')}</span>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Lock Workers Checkbox - Only show in create mode */}
                  {!isEditMode && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="lockWorkers"
                        checked={lockWorkers}
                        onChange={(e) => setLockWorkers(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <Label htmlFor="lockWorkers" className="cursor-pointer">
                        {t('assignments.lockWorkersAfterAssign')}
                      </Label>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <Label>{t('assignments.notes')}</Label>
                    <Input
                      placeholder={t('assignments.addNotes')}
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      handleDialogClose(false);
                    }} disabled={isLoading}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      onClick={handleCreateAssignment}
                      disabled={isLoading || selectedWorkers.length === 0}
                      className="bg-brand-gradient hover:shadow-md text-white"
                    >
                      {isLoading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {isEditMode ? t('assignments.updateAssignment') : t('assignments.addAssignment')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Title and description */}
      <div>
        <h2 className="text-gray-900 font-semibold">
          {t('assignments.boardTitle')} - {selectedDate
            ? t('assignments.forDate', { date: new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) })
            : t('assignments.allAssignments')
          }
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {selectedDate
            ? t('assignments.dragWorkersHint')
            : t('assignments.dragWorkersHintAll')
          }
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <Label className="mb-2 block text-sm text-gray-600">{t('assignments.assignmentDate')}</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-gray-300 focus:ring-brand-500 focus:border-brand-500"
              placeholder={t('assignments.selectDateFilter')}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate('')}
              className="whitespace-nowrap"
            >
              {t('assignments.showAll')}
            </Button>
          </div>
          {!selectedDate && (
            <p className="text-xs text-gray-500 mt-1">{t('assignments.showingAllAssignments')}</p>
          )}
          {selectedDate && (
            <p className="text-xs text-gray-500 mt-1">{t('assignments.filteredBy')} {selectedDate}</p>
          )}
        </Card>
        <Card className="p-4 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">{t('assignments.assignmentsLabel')}</p>
            {isLoading && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
          </div>
          <p className="text-2xl font-semibold text-brand-600">
            {getAssignmentsCount()}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {selectedDate ? t('assignments.forDate', { date: new Date(selectedDate).toLocaleDateString() }) : t('assignments.totalActive')}
          </p>
        </Card>
        <Card className="p-4 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">{t('assignments.availableWorkers')}</p>
            {isLoading && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
          </div>
          <p className="text-2xl font-semibold text-brand-600">{getAvailableWorkersCount()}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t('assignments.unlockedActive', { count: allWorkers.filter(w => w.isLocked).length })}
          </p>
        </Card>
        <Card className="p-4 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">{t('assignments.availableCars')}</p>
            {isLoading && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
          </div>
          <p className="text-2xl font-semibold text-brand-600">{getAvailableCars().length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t('assignments.activeUnlocked', { count: allCars.filter(c => c.isLocked).length })}
          </p>
        </Card>
      </div>

      {/* Main board */}
      <div className="flex gap-6">
        {/* Drag indicator overlay */}
        {draggedWorker && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <p className="text-sm font-medium">
              {t('assignments.dragging', { name: draggedWorker.fullName })}
              <span className="ml-2">🎯 {t('assignments.dropOnSite')}</span>
            </p>
          </div>
        )}
        {/* Left side - Available Workers Pool */}
        <div className="w-80 flex-shrink-0">
          <Card className="p-4 h-full bg-white border border-gray-200 shadow-sm">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                {t('assignments.availableWorkersPool', { count: availableWorkers.length })}
              </h3>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('assignments.searchWorkers')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllDayOff}
                  disabled={isLoading || availableWorkers.filter(w => {
                    // Only count workers who are not assigned
                    const hasAssignment = assignments.some(assignment => {
                      if (!selectedDate) {
                        return assignment.workerId === w.id;
                      }
                      const assignmentDate = new Date(assignment.assignedDate).toISOString().split('T')[0];
                      return assignment.workerId === w.id && assignmentDate === selectedDate;
                    });
                    return !hasAssignment && !workersOnDayOff.includes(w.id);
                  }).length === 0}
                  className="w-full text-orange-600 hover:bg-orange-50 border-orange-200"
                >
                  <Power className="w-4 h-4 mr-2" />
                  {t('assignments.markAllDayOff')}
                </Button>
              )}
            </div>

            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="space-y-2 pr-4">
                {availableWorkers
                  .filter(w => w.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .filter(w => !workersOnDayOff.includes(w.id)) // Filter out workers on day-off
                  .map(worker => {
                    // Check if worker has any assignments for the selected date
                    const hasAssignment = assignments.some(assignment => {
                      if (!selectedDate) {
                        // If no date selected, check if worker has any assignment
                        return assignment.workerId === worker.id;
                      }
                      // If date selected, check if worker has assignment for that date
                      const assignmentDate = new Date(assignment.assignedDate).toISOString().split('T')[0];
                      return assignment.workerId === worker.id && assignmentDate === selectedDate;
                    });

                    return (
                      <div
                        key={worker.id}
                        draggable={canEdit}
                        onDragStart={() => handleDragStart(worker)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 bg-white border border-gray-200 rounded-lg transition-all ${canEdit
                          ? `cursor-move hover:shadow-md hover:border-brand-300 ${draggedWorker?.id === worker.id ? 'opacity-50 scale-95' : ''
                          }`
                          : 'cursor-default'
                          }`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                {worker.fullName.charAt(0).toUpperCase()}
                              </div>
                              <p className="font-medium text-gray-900 truncate text-sm">
                                {worker.fullName}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{worker.role}</p>
                          </div>
                          {canEdit && !hasAssignment && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-100 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDayOff(worker.id);
                              }}
                              disabled={isLoading}
                              title={t('assignments.markDayOff')}
                            >
                              <Power className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                
                {/* Show workers on day-off in a separate section */}
                {workersOnDayOff.length > 0 && (
                  <>
                    <div className="pt-4 mt-4 border-t border-gray-300">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                        {t('assignments.onDayOff', { count: workersOnDayOff.length })}
                      </h4>
                    </div>
                    {allWorkers
                      .filter(w => workersOnDayOff.includes(w.id))
                      .filter(w => w.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(worker => (
                        <div
                          key={worker.id}
                          className="p-3 bg-gray-100 border border-gray-300 rounded-lg"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                  {worker.fullName.charAt(0).toUpperCase()}
                                </div>
                                <p className="font-medium text-gray-600 truncate text-sm">
                                  {worker.fullName}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{worker.role}</p>
                            </div>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-green-600 hover:bg-green-100 hover:text-green-700 cursor-pointer flex-shrink-0 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDayOff(worker.id);
                                }}
                                disabled={isLoading}
                                title={t('assignments.markAvailable')}
                              >
                                <Power className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right side - Sites Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSites
              .map(site => ({
                site,
                assignments: getSiteAssignments(site.id),
              }))
              .filter(({ assignments }) => assignments.length > 0)
              .map(({ site, assignments: siteAssignments }) => {
                const siteColor = site.name.includes('Tirana') ? 'blue' :
                  site.name.includes('Durres') ? 'green' :
                    site.name.includes('Vlore') ? 'orange' : 'purple';

                const isCompleted = isSiteCompleted(site);
                const canEditThisSite = canEditSite(site);

                return (
                  <Card
                    key={site.id}
                    onDragOver={canEditThisSite ? handleDragOver : undefined}
                    onDragEnter={canEditThisSite ? () => handleDragEnter(site.id) : undefined}
                    onDragLeave={canEditThisSite ? handleDragLeave : undefined}
                    onDrop={canEditThisSite ? () => handleDropOnSite(site.id) : undefined}
                    className={`p-4 border-2 border-dashed transition-all ${isCompleted
                      ? 'border-gray-300 bg-gray-50 opacity-75'
                      : dragOverSite === site.id
                        ? 'border-green-400 bg-green-50 shadow-lg scale-105'
                        : draggedWorker && canEditThisSite
                          ? 'border-brand-300 bg-white hover:border-brand-400 hover:shadow-md'
                          : 'border-gray-300 bg-white hover:border-brand-400 hover:shadow-md'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-2 flex-1">
                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${isCompleted ? 'bg-gray-400' : `bg-${siteColor}-500`
                          }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-semibold text-sm ${isCompleted ? 'text-gray-600' : 'text-gray-900'
                              }`}>
                              {site.name}
                            </h3>
                            {isCompleted && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                ✓ {t('assignments.siteComplete')}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${isCompleted ? 'text-gray-500' : 'text-gray-600'
                            }`}>
                            {site.address}
                          </p>
                          <p className={`text-xs mt-1 ${isCompleted ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                            📅 {selectedDate}
                          </p>
                        </div>
                      </div>
                      {isCompleted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpandedSite(site.id)}
                          className="h-6 w-6 p-0 text-gray-600 hover:bg-gray-200 flex-shrink-0"
                          title={expandedSites.has(site.id) ? t('assignments.collapse') : t('assignments.expand')}
                        >
                          {expandedSites.has(site.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Display car info at the top if assigned */}
                    {siteAssignments.length > 0 && siteAssignments[0]?.carId && (
                      <div className={`mb-3 p-2 border rounded-lg flex items-center justify-between ${isCompleted
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-blue-50 border-blue-200'
                        }`}>
                        <p className={`text-xs font-medium ${isCompleted ? 'text-gray-600' : 'text-blue-700'
                          }`}>
                          🚗 {allCars.find(c => c.id === siteAssignments[0].carId)?.name} - {allCars.find(c => c.id === siteAssignments[0].carId)?.number}
                        </p>
                        {canEditThisSite && siteAssignments[0]?.carId && (
                          <>
                            {allCars.find(c => c.id === siteAssignments[0].carId)?.isLocked ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 text-orange-600 hover:bg-orange-100"
                                onClick={() => handleUnlockCar(siteAssignments[0].carId!)}
                                disabled={isLoading}
                                title={t('assignments.unlockCar')}
                              >
                                <Lock className="w-3 h-3" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 text-orange-400 hover:bg-orange-100"
                                onClick={() => handleLockCar(siteAssignments[0].carId!)}
                                disabled={isLoading}
                                title={t('assignments.lockCar')}
                              >
                                <Unlock className="w-3 h-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {siteAssignments.length === 0 ? (
                      <div className={`text-center py-8 transition-all ${isCompleted
                        ? 'text-gray-400'
                        : dragOverSite === site.id
                          ? 'text-green-600'
                          : 'text-gray-400'
                        }`}>
                        <p className="text-sm font-medium">
                          {isCompleted
                            ? `✓ ${t('assignments.siteCompleted')}`
                            : dragOverSite === site.id
                              ? `✨ ${t('assignments.dropWorkerHere')}`
                              : t('assignments.dropWorkersHere')
                          }
                        </p>
                        {!isCompleted && (
                          <p className="text-xs mt-1">or use {t('assignments.addAssignment')}</p>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* For completed sites, only show workers if expanded */}
                        {isCompleted && !expandedSites.has(site.id) ? (
                          <div className="text-center py-4">
                            <p className="text-xs text-gray-500">
                              {t('assignments.workersAssigned', { count: siteAssignments.length })}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dragOverSite === site.id && !isCompleted && (
                              <div className="p-2 rounded-lg border-2 border-dashed border-green-400 bg-green-50 text-center">
                                <p className="text-sm font-medium text-green-600">
                                  {t('assignments.addWorkerToSite', { name: draggedWorker?.fullName || '' })}
                                </p>
                              </div>
                            )}
                            {siteAssignments.map(assignment => {
                              // Use worker data from assignment, not from allWorkers
                              const worker = assignment.worker;

                              if (!worker) return null;

                              return (
                                <div
                                  key={assignment.id}
                                  className={`p-2 rounded-lg border ${isCompleted
                                    ? 'border-gray-200 bg-gray-50'
                                    : 'border-gray-200 bg-gray-50'
                                    }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${isCompleted
                                        ? 'bg-gray-100 text-gray-600'
                                        : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        {worker.fullName.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-medium truncate text-xs ${isCompleted ? 'text-gray-600' : 'text-gray-900'
                                          }`}>
                                          {worker.fullName}
                                        </p>
                                      </div>
                                    </div>
                                    {canEditThisSite && (
                                      <div className="flex gap-1 flex-shrink-0">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-gray-600 hover:bg-gray-100"
                                          onClick={() => setViewAssignment(assignment)}
                                          title={t('assignments.viewDetails')}
                                        >
                                          <Eye className="w-3 h-3" />
                                        </Button>
                                        {worker?.isLocked ? (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-red-600 hover:bg-green-100"
                                            onClick={() => handleUnlockWorker(worker.id)}
                                            disabled={isLoading}
                                            title={t('assignments.unlockWorker')}
                                          >
                                            <Lock className="w-3 h-3" />
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-green-600 hover:bg-red-100"
                                            onClick={() => handleLockWorker(worker.id)}
                                            disabled={isLoading}
                                            title={t('assignments.lockWorker')}
                                          >
                                            <Unlock className="w-3 h-3" />
                                          </Button>
                                        )}

                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                                          onClick={() => handleDeleteAssignment(assignment.id)}
                                          disabled={isLoading}
                                          title={t('assignments.removeAssignment')}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {siteAssignments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                        {isCompleted ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              ✓ {t('assignments.siteCompleted')}
                            </span>
                            <span className="text-xs">{t('assignments.assignmentsReadOnly')}</span>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-brand-600 hover:bg-brand-50 font-medium"
                              onClick={() => {
                                const lockedWorkerIds = siteAssignments
                                  .map(a => a.workerId)
                                  .filter(workerId => {
                                    const worker = allWorkers.find(w => w.id === workerId);
                                    return worker?.isLocked;
                                  });
                                if (lockedWorkerIds.length > 0) {
                                  handleBulkLockWorkers(lockedWorkerIds, false);
                                } else {
                                  toast.info(t('assignments.noLockedWorkers'));
                                }
                              }}
                              disabled={isLoading || !siteAssignments.some(a => {
                                const worker = allWorkers.find(w => w.id === a.workerId);
                                return worker?.isLocked;
                              })}
                            >
                              <Unlock className="w-3 h-3 mr-1" />
                              {t('assignments.unlockAll')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-600 hover:bg-red-50 font-medium"
                              onClick={() => {
                                const unlockedWorkerIds = siteAssignments
                                  .map(a => a.workerId)
                                  .filter(workerId => {
                                    const worker = allWorkers.find(w => w.id === workerId);
                                    return !worker?.isLocked;
                                  });
                                if (unlockedWorkerIds.length > 0) {
                                  handleBulkLockWorkers(unlockedWorkerIds, true);
                                } else {
                                  toast.info(t('assignments.noUnlockedWorkers'));
                                }
                              }}
                              disabled={isLoading || !siteAssignments.some(a => {
                                const worker = allWorkers.find(w => w.id === a.workerId);
                                return !worker?.isLocked;
                              })}
                            >
                              <Lock className="w-3 h-3 mr-1" />
                              {t('assignments.lockAll')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-gray-600 hover:bg-gray-100"
                              onClick={() => {
                                if (siteAssignments.length > 0) {
                                  handleEditAssignment(siteAssignments); // Pass all assignments
                                }
                              }}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              {t('assignments.edit')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-600 hover:bg-red-100"
                              onClick={() => handleDeleteSiteCard(site.id, siteAssignments)}
                              disabled={isLoading}
                              title={t('assignments.deleteAllAssignments')}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              {t('assignments.delete')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
          </div>
        </div>
      </div>

      {/* Assignment Export Dialog */}
      <AssignmentExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        assignments={assignments}
      />

      {/* Worker Details Dialog */}
      <WorkerAssignmentDetailsDialog
        isOpen={!!viewAssignment}
        onClose={() => setViewAssignment(null)}
        assignment={viewAssignment}
        onHistoryToggled={(assignmentId, showAssignmentHistory) => {
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === assignmentId ? { ...a, showAssignmentHistory } : a
            )
          );
          if (viewAssignment?.id === assignmentId) {
            setViewAssignment((prev) =>
              prev ? { ...prev, showAssignmentHistory } : null
            );
          }
        }}
      />
    </div>
  );
}
