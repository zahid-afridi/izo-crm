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
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchAssignmentsData, fetchDailyProgramThunk, lockEntities,
  setWorkerLocked, setBulkWorkersLocked, setCarLocked, setWorkerDayOff,
  type Assignment, type AssignmentWorker, type AssignmentCar, type AssignmentSite,
} from '@/store/slices/assignmentsSlice';
import {
  selectAssignments, selectAllWorkers, selectAvailableWorkers, selectAllCars,
  selectAllSites, selectAllTeams, selectWorkersOnDayOff,
  selectAssignmentsIsLoading, selectAssignmentsIsInitialized,
} from '@/store/selectors/assignmentsSelectors';

interface AssignmentsPageProps {
  userRole: string;
}

export function AssignmentsPage({ userRole }: AssignmentsPageProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  // Redux state
  const assignments = useAppSelector(selectAssignments);
  const allWorkers = useAppSelector(selectAllWorkers);
  const availableWorkers = useAppSelector(selectAvailableWorkers);
  const allCars = useAppSelector(selectAllCars);
  const allSites = useAppSelector(selectAllSites);
  const allTeams = useAppSelector(selectAllTeams);
  const workersOnDayOff = useAppSelector(selectWorkersOnDayOff);
  const isLoading = useAppSelector(selectAssignmentsIsLoading);
  const isInitialized = useAppSelector(selectAssignmentsIsInitialized);

  // Local UI state (not data)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [dialogAssignmentDate, setDialogAssignmentDate] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editingAssignments, setEditingAssignments] = useState<Assignment[]>([]);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [viewAssignment, setViewAssignment] = useState<Assignment | null>(null);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [lockCar, setLockCar] = useState(false);
  const [lockWorkers, setLockWorkers] = useState(false);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [workersOnDayOffForDialog, setWorkersOnDayOffForDialog] = useState<string[]>([]);
  const [draggedWorker, setDraggedWorker] = useState<AssignmentWorker | null>(null);
  const [dragOverSite, setDragOverSite] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    siteId: '',
    workerId: '',
    carId: '',
    notes: '',
  });

  const canEdit = ['admin', 'site_manager'].includes(userRole);

  // Initial load
  useEffect(() => {
    dispatch(fetchAssignmentsData(selectedDate || undefined));
  }, [dispatch, selectedDate]);

  // Fetch daily program when date changes
  useEffect(() => {
    const date = selectedDate || new Date().toISOString().split('T')[0];
    dispatch(fetchDailyProgramThunk(date));
  }, [selectedDate, dispatch]);

  // Refetch day-off workers when dialog assignment date changes
  useEffect(() => {
    if (isCreateDialogOpen && !isEditMode && dialogAssignmentDate) {
      fetchDailyProgramForDate(dialogAssignmentDate).then(setWorkersOnDayOffForDialog);
    }
  }, [dialogAssignmentDate, isCreateDialogOpen, isEditMode]);

  const fetchDailyProgramForDate = async (date: string): Promise<string[]> => {
    try {
      const res = await fetch(`/api/daily-program?date=${date}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.workersOnDayOff || [];
    } catch {
      return [];
    }
  };

  const refreshData = () => {
    dispatch(fetchAssignmentsData(selectedDate || undefined));
  };

  const canAssignWorker = (workerId: string, siteId: string, assignmentDate: string) => {
    const worker = allWorkers.find(w => w.id === workerId);
    if (!worker) return false;
    if (!worker.isLocked) return true;
    const dateToCheck = new Date(assignmentDate);
    const startOfDay = new Date(dateToCheck.getFullYear(), dateToCheck.getMonth(), dateToCheck.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    return assignments.some(a => {
      const dt = new Date(a.assignedDate);
      return a.siteId === siteId && a.workerId === workerId && dt >= startOfDay && dt < endOfDay;
    });
  };

  const handleDialogClose = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (open && !isEditMode) {
      const date = selectedDate || new Date().toISOString().split('T')[0];
      setDialogAssignmentDate(date);
      fetchDailyProgramForDate(date).then(setWorkersOnDayOffForDialog);
    }
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
      setFormData({ siteId: '', workerId: '', carId: '', notes: '' });
    }
  };

  const resetForm = () => {
    setFormData({ siteId: '', workerId: '', carId: '', notes: '' });
    setError('');
    setSelectedWorkers([]);
    setSelectedTeam('');
    setLockCar(false);
    setLockWorkers(false);
    setIsEditMode(false);
    setEditingAssignment(null);
    setEditingAssignments([]);
    setDialogAssignmentDate('');
  };

  const getAvailableCars = () => {
    const available = allCars.filter((car: AssignmentCar) => car.status === 'active' && !car.isLocked);
    // In edit mode, always include the currently assigned car even if locked
    if (isEditMode && formData.carId) {
      const assignedCar = allCars.find(c => c.id === formData.carId);
      if (assignedCar && !available.find(c => c.id === assignedCar.id)) {
        return [assignedCar, ...available];
      }
    }
    return available;
  };

  const getAvailableWorkersCount = () => availableWorkers.length;

  const getAssignmentsCount = () => {
    const filtered = !selectedDate
      ? assignments
      : assignments.filter(a => new Date(a.assignedDate).toISOString().split('T')[0] === selectedDate);
    return new Set(filtered.map(a => a.siteId)).size;
  };

  const getSiteAssignments = (siteId: string) =>
    assignments.filter(a => {
      if (!selectedDate) return a.siteId === siteId;
      return a.siteId === siteId && new Date(a.assignedDate).toISOString().split('T')[0] === selectedDate;
    });

  const isSiteCompleted = (site: AssignmentSite) => site.status === 'completed';
  const canEditSite = (site: AssignmentSite) => canEdit && !isSiteCompleted(site);

  const toggleExpandedSite = (siteId: string) => {
    setExpandedSites(prev => {
      const s = new Set(prev);
      s.has(siteId) ? s.delete(siteId) : s.add(siteId);
      return s;
    });
  };

  const availableSites = useMemo(() => {
    const dateToCheck = dialogAssignmentDate || selectedDate;
    const sitesWithAssignments = !dateToCheck
      ? [...new Set(assignments.map(a => a.siteId))]
      : assignments.filter(a => new Date(a.assignedDate).toISOString().split('T')[0] === dateToCheck).map(a => a.siteId);
    return allSites.filter(site => !sitesWithAssignments.includes(site.id) && !isSiteCompleted(site));
  }, [allSites, assignments, dialogAssignmentDate, selectedDate]);

  const getAvailableSites = () => availableSites;

  const getFilteredWorkers = () => {
    const dayOffIds = isCreateDialogOpen ? workersOnDayOffForDialog : workersOnDayOff;
    const excludeDayOff = (list: AssignmentWorker[]) => list.filter(w => !dayOffIds.includes(w.id));
    if (selectedTeam === 'all') return excludeDayOff(availableWorkers);
    if (selectedTeam) {
      const team = allTeams.find((t: any) => t.id === selectedTeam);
      if (team) {
        const ids = [team.teamLeadId, ...team.memberIds];
        return excludeDayOff(availableWorkers.filter(w => ids.includes(w.id)));
      }
    }
    return excludeDayOff(availableWorkers);
  };

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeam(teamId);
    if (teamId === 'all') setSelectedWorkers(availableWorkers.map(w => w.id));
    else if (teamId === 'none') setSelectedWorkers([]);
    else {
      const team = allTeams.find((t: any) => t.id === teamId);
      if (team) setSelectedWorkers([...new Set([team.teamLeadId, ...team.memberIds])]);
    }
  };

  const handleWorkerToggle = (workerId: string) => {
    setSelectedWorkers(prev => prev.includes(workerId) ? prev.filter(id => id !== workerId) : [...prev, workerId]);
    setSelectedTeam('');
  };

  const handleCreateAssignment = async () => {
    try {
      setError('');
      if (!dialogAssignmentDate || !formData.siteId || selectedWorkers.length === 0) {
        setError(t('assignments.assignmentRequired'));
        return;
      }
      setSubmitting(true);

      const validWorkerIds = selectedWorkers.filter(id => allWorkers.some(w => w.id === id && w.role === 'worker'));
      if (validWorkerIds.length === 0) { setError(t('assignments.noValidWorkers')); setSubmitting(false); return; }

      if (isEditMode && editingAssignment) {
        const originalWorkerIds = editingAssignments.map(a => a.workerId);
        const originalAssignmentIds = editingAssignments.map(a => a.id);

        if (validWorkerIds.length === 1 && originalWorkerIds.length === 1 && validWorkerIds[0] === originalWorkerIds[0]) {
          const res = await fetch(`/api/assignments/${editingAssignment.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteId: formData.siteId, workerId: validWorkerIds[0], carId: formData.carId || null, assignedDate: dialogAssignmentDate, status: 'active', notes: formData.notes || null }),
          });
          if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to update assignment'); }
        } else {
          const res = await fetch('/api/assignments/bulk-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteId: formData.siteId, workerIds: validWorkerIds, carId: formData.carId || null, assignedDate: dialogAssignmentDate, notes: formData.notes || null, originalAssignmentIds }),
          });
          if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to update assignments'); }
        }
        refreshData();
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success(t('assignments.updateSuccess'));
      } else {
        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: formData.siteId, workerIds: validWorkerIds, carId: formData.carId || null, assignedDate: dialogAssignmentDate, status: 'active', notes: formData.notes || null }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create assignment'); }

        if (lockCar && formData.carId) {
          dispatch(setCarLocked({ carId: formData.carId, isLocked: true }));
          dispatch(lockEntities({ type: 'car', ids: [formData.carId], isLocked: true }));
        }
        if (lockWorkers) {
          dispatch(setBulkWorkersLocked({ workerIds: validWorkerIds, isLocked: true }));
          dispatch(lockEntities({ type: 'worker', ids: validWorkerIds, isLocked: true }));
        }
        refreshData();
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success(t('assignments.createSuccess'));
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to process assignment';
      if (msg.includes('locked and cannot be assigned')) {
        const match = msg.match(/The following workers are locked and cannot be assigned: ([^.]+)\./);
        const detail = match ? `Cannot assign locked workers: ${match[1]}` : msg;
        setError(`${detail}\n\nSuggestions:\n• Unlock the workers first, or\n• Remove them from selection`);
        toast.error(`${detail}. Please unlock them first.`);
      } else {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm(t('assignments.deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete assignment');
      const data = await res.json();
      refreshData();
      toast.success(data.workerUnlocked ? t('assignments.assignmentDeletedUnlocked', { name: data.workerName }) : t('assignments.deleteSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToDelete'));
    }
  };

  const handleEditAssignment = (assignmentOrAssignments: Assignment | Assignment[]) => {
    const arr = Array.isArray(assignmentOrAssignments) ? assignmentOrAssignments : [assignmentOrAssignments];
    const first = arr[0];
    setEditingAssignment(first);
    setEditingAssignments(arr);
    setIsEditMode(true);
    setFormData({ siteId: first.siteId, workerId: '', carId: first.carId || '', notes: first.notes || '' });
    const allIds = arr.map(a => a.workerId);
    const validIds = allIds.filter(id => allWorkers.some(w => w.id === id && w.role === 'worker'));
    setSelectedWorkers(validIds);
    const date = new Date(first.assignedDate).toISOString().split('T')[0];
    setDialogAssignmentDate(date);
    fetchDailyProgramForDate(date).then(setWorkersOnDayOffForDialog);
    setIsCreateDialogOpen(true);
  };

  const handleDeleteSiteCard = async (siteId: string, siteAssignments: Assignment[]) => {
    if (!confirm(t('assignments.deleteSiteConfirm', { count: siteAssignments.length }))) return;
    try {
      const res = await fetch('/api/assignments/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentIds: siteAssignments.map(a => a.id) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to delete'); }
      const result = await res.json();
      refreshData();
      toast.success(t('assignments.assignmentsDeleted', { message: result.message, deleted: result.deletedCount, unlocked: result.unlockedWorkers }));
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToDeleteSite'));
    }
  };

  const handleLockWorker = async (workerId: string) => {
    dispatch(setWorkerLocked({ workerId, isLocked: true }));
    const result = await dispatch(lockEntities({ type: 'worker', ids: [workerId], isLocked: true }));
    if (lockEntities.rejected.match(result)) {
      dispatch(setWorkerLocked({ workerId, isLocked: false }));
      toast.error(t('assignments.failedToLockWorker'));
    } else {
      toast.success(t('assignments.workerLockedSuccess'));
    }
  };

  const handleUnlockWorker = async (workerId: string) => {
    dispatch(setWorkerLocked({ workerId, isLocked: false }));
    const result = await dispatch(lockEntities({ type: 'worker', ids: [workerId], isLocked: false }));
    if (lockEntities.rejected.match(result)) {
      dispatch(setWorkerLocked({ workerId, isLocked: true }));
      toast.error(t('assignments.failedToUnlockWorker'));
    } else {
      toast.success(t('assignments.workerUnlockedSuccess'));
    }
  };

  const handleBulkLockWorkers = async (workerIds: string[], isLocked: boolean) => {
    const unique = [...new Set(workerIds)].filter(id => allWorkers.some(w => w.id === id));
    if (!unique.length) { toast.error(t('assignments.noValidWorkersToUpdate')); return; }
    dispatch(setBulkWorkersLocked({ workerIds: unique, isLocked }));
    const result = await dispatch(lockEntities({ type: 'worker', ids: unique, isLocked }));
    if (lockEntities.rejected.match(result)) {
      dispatch(setBulkWorkersLocked({ workerIds: unique, isLocked: !isLocked }));
      toast.error(t('assignments.failedToLoadData'));
    } else {
      const data = result.payload as any;
      toast.success(data?.message || `Workers ${isLocked ? 'locked' : 'unlocked'}`);
    }
  };

  const handleLockAllWorkers = () => {
    const ids = allWorkers.filter(w => !w.isLocked).map(w => w.id);
    if (!ids.length) { toast.info(t('assignments.allWorkersLocked')); return; }
    handleBulkLockWorkers(ids, true);
  };

  const handleUnlockAllWorkers = () => {
    const ids = allWorkers.filter(w => w.isLocked).map(w => w.id);
    if (!ids.length) { toast.info(t('assignments.allWorkersUnlocked')); return; }
    handleBulkLockWorkers(ids, false);
  };

  const handleLockCar = async (carId: string) => {
    dispatch(setCarLocked({ carId, isLocked: true }));
    const result = await dispatch(lockEntities({ type: 'car', ids: [carId], isLocked: true }));
    if (lockEntities.rejected.match(result)) {
      dispatch(setCarLocked({ carId, isLocked: false }));
      toast.error(t('assignments.failedToLockCar'));
    } else {
      toast.success(t('assignments.carLockedSuccess'));
    }
  };

  const handleUnlockCar = async (carId: string) => {
    dispatch(setCarLocked({ carId, isLocked: false }));
    const result = await dispatch(lockEntities({ type: 'car', ids: [carId], isLocked: false }));
    if (lockEntities.rejected.match(result)) {
      dispatch(setCarLocked({ carId, isLocked: true }));
      toast.error(t('assignments.failedToUnlockCar'));
    } else {
      toast.success(t('assignments.carUnlockedSuccess'));
    }
  };

  const handleToggleDayOff = async (workerId: string) => {
    try {
      const dateParam = selectedDate || new Date().toISOString().split('T')[0];
      const res = await fetch('/api/daily-program/toggle-day-off', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workerId, date: dateParam }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to toggle day off'); }
      const data = await res.json();
      dispatch(setWorkerDayOff({ workerId, isOnDayOff: data.isOnDayOff }));
      toast.success(data.isOnDayOff ? t('assignments.workerMarkedDayOff') : t('assignments.workerNowAvailable'));
      refreshData();
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToLoadData'));
    }
  };

  const handleMarkAllDayOff = async () => {
    const unassigned = availableWorkers.filter(worker => {
      const hasAssignment = assignments.some(a => {
        if (!selectedDate) return a.workerId === worker.id;
        return a.workerId === worker.id && new Date(a.assignedDate).toISOString().split('T')[0] === selectedDate;
      });
      return !hasAssignment && !workersOnDayOff.includes(worker.id);
    });
    if (!unassigned.length) { toast.info(t('assignments.noUnassignedWorkers')); return; }
    if (!confirm(t('assignments.markDayOffConfirm', { count: unassigned.length, date: selectedDate || t('common.today') }))) return;
    const dateParam = selectedDate || new Date().toISOString().split('T')[0];
    const results = await Promise.all(unassigned.map(w =>
      fetch('/api/daily-program/toggle-day-off', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workerId: w.id, date: dateParam }) })
    ));
    const failed = results.filter(r => !r.ok).length;
    if (failed) toast.error(t('assignments.failedMarkDayOff', { count: failed }));
    else toast.success(t('assignments.workersMarkedDayOff', { count: unassigned.length }));
    refreshData();
    dispatch(fetchDailyProgramThunk(dateParam));
  };

  const handleDragStart = (worker: AssignmentWorker) => setDraggedWorker(worker);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragEnter = (siteId: string) => {
    if (draggedWorker && canEdit) {
      const site = allSites.find(s => s.id === siteId);
      if (site && !isSiteCompleted(site)) setDragOverSite(siteId);
    }
  };
  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) setDragOverSite(null);
  };
  const handleDragEnd = () => { setDraggedWorker(null); setDragOverSite(null); };

  const handleDropOnSite = async (siteId: string) => {
    if (!draggedWorker || !canEdit) { setDraggedWorker(null); return; }
    const site = allSites.find(s => s.id === siteId);
    if (site && isSiteCompleted(site)) { toast.error(t('assignments.cannotAssignCompleted')); setDraggedWorker(null); return; }
    const exists = assignments.some(a => {
      const date = selectedDate ? new Date(a.assignedDate).toISOString().split('T')[0] : null;
      return a.siteId === siteId && a.workerId === draggedWorker.id && (selectedDate ? date === selectedDate : true);
    });
    if (exists) { toast.info(t('assignments.alreadyAssigned', { name: draggedWorker.fullName, dateSuffix: selectedDate ? t('assignments.onThisDate') : '' })); setDraggedWorker(null); return; }
    try {
      const assignmentDate = selectedDate || new Date().toISOString().split('T')[0];
      const res = await fetch('/api/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ siteId, workerIds: [draggedWorker.id], carId: null, assignedDate: assignmentDate, status: 'active', notes: null }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create assignment'); }
      refreshData();
      toast.success(t('assignments.assignedSuccess', { name: draggedWorker.fullName, site: allSites.find(s => s.id === siteId)?.name || 'site' }));
    } catch (err: any) {
      toast.error(err.message || t('assignments.failedToAssignWorker'));
    } finally {
      setDraggedWorker(null);
    }
  };

  const filteredSites = allSites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)} className="flex-1 sm:flex-none text-xs sm:text-sm">
            <Download className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">{t('assignments.exportReport')}</span>
            <span className="xs:hidden">{t('assignments.export')}</span>
          </Button>
          <Button variant="outline" onClick={refreshData} disabled={isLoading} className="flex-1 sm:flex-none text-xs sm:text-sm">
            {isLoading ? <Loader className="w-4 h-4 mr-1 sm:mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-1 sm:mr-2" />}
            <span className="hidden xs:inline">{t('assignments.refreshData')}</span>
            <span className="xs:hidden">{t('assignments.refresh')}</span>
          </Button>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">{t('assignments.assignmentDate')}</Label>
                      <Input type="date" value={dialogAssignmentDate} onChange={(e) => setDialogAssignmentDate(e.target.value)} className="text-sm" />
                    </div>
                    <div>
                      <Label className="text-sm">{t('assignments.constructionSite')} *</Label>
                      {isEditMode ? (
                        <Input value={editingAssignment?.site?.name || ''} disabled className="bg-gray-100 text-sm" />
                      ) : (
                        <Select value={formData.siteId} onValueChange={(v) => setFormData(p => ({ ...p, siteId: v }))}>
                          <SelectTrigger className="text-sm"><SelectValue placeholder={t('assignments.selectSite')} /></SelectTrigger>
                          <SelectContent>
                            {getAvailableSites().map(site => (
                              <SelectItem key={site.id} value={site.id} className="text-sm">{site.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">{t('assignments.selectCar')}</Label>
                    <Select value={formData.carId || 'none'} onValueChange={(v) => setFormData(p => ({ ...p, carId: v === 'none' ? '' : v }))}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder={t('assignments.selectCarOptional')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-sm">{t('assignments.noCar')}</SelectItem>
                        {getAvailableCars().map(car => (
                          <SelectItem key={car.id} value={car.id} className="text-sm">
                            {car.name} - {car.number} ({car.color}){car.isLocked ? ' 🔒' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isEditMode && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="lockCar" checked={lockCar} onChange={(e) => setLockCar(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                      <Label htmlFor="lockCar" className="cursor-pointer text-sm">{t('assignments.lockCarAfterAssign')}</Label>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm">{t('assignments.selectWorkers')}</Label>
                      <button onClick={() => setSelectedWorkers([])} className="text-xs sm:text-sm text-brand-600 hover:text-brand-700 font-medium">
                        {t('assignments.clear')} ({selectedWorkers.length})
                      </button>
                    </div>
                    {(() => {
                      const locked = selectedWorkers.map(id => allWorkers.find(w => w.id === id)).filter(w => w && w.isLocked);
                      return locked.length > 0 ? (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {t('assignments.lockedWorkersWarning', { count: locked.length })}: {locked.map(w => w!.fullName).join(', ')}
                            <br /><span className="text-xs">{t('assignments.lockedWorkersHint')}</span>
                          </AlertDescription>
                        </Alert>
                      ) : null;
                    })()}
                    <div className="mb-4">
                      <Select value={selectedTeam} onValueChange={handleTeamSelect}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder={isEditMode ? t('assignments.addTeamMembers') : t('assignments.selectTeam')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-sm">{t('assignments.allWorkers')}</SelectItem>
                          <SelectItem value="none" className="text-sm">{t('assignments.unselectAll')}</SelectItem>
                          {allTeams.filter((team: any) => team.status === 'active').map((team: any) => (
                            <SelectItem key={team.id} value={team.id} className="text-sm">{team.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input placeholder={t('assignments.searchWorkers')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 text-sm" />
                    </div>
                    <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {isEditMode ? (
                        <>
                          {selectedWorkers.map(workerId => {
                            const worker = allWorkers.find(w => w.id === workerId);
                            if (!worker || !worker.fullName.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                            return (
                              <div key={workerId} className={`flex items-center gap-3 p-2 sm:p-3 border rounded-lg cursor-pointer ${worker.isLocked ? 'border-red-300 bg-red-50 hover:bg-red-100' : 'border-blue-300 bg-blue-50 hover:bg-blue-100'}`} onClick={() => handleWorkerToggle(workerId)}>
                                <input type="checkbox" checked={true} onChange={() => { }} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900 text-sm truncate">{worker.fullName}</p>
                                    {worker.isLocked && <Lock className="w-3 h-3 text-red-500" />}
                                  </div>
                                  <p className="text-xs text-gray-500">{worker.role}</p>
                                </div>
                                <span className={`text-xs font-medium hidden sm:inline ${worker.isLocked ? 'text-red-600' : 'text-blue-600'}`}>
                                  {worker.isLocked ? t('assignments.lockedWorker') : t('assignments.currentWorker')}
                                </span>
                              </div>
                            );
                          })}
                          {getFilteredWorkers().filter(w => !selectedWorkers.includes(w.id) && w.fullName.toLowerCase().includes(searchQuery.toLowerCase())).map(worker => (
                            <div key={worker.id} className="flex items-center gap-3 p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => handleWorkerToggle(worker.id)}>
                              <input type="checkbox" checked={selectedWorkers.includes(worker.id)} onChange={() => { }} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{worker.fullName}</p>
                                <p className="text-xs text-gray-500">{worker.role}</p>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        getFilteredWorkers().filter(w => w.fullName.toLowerCase().includes(searchQuery.toLowerCase())).map(worker => (
                          <div key={worker.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${worker.isLocked ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-gray-200 hover:bg-gray-50'}`} onClick={() => handleWorkerToggle(worker.id)}>
                            <input type="checkbox" checked={selectedWorkers.includes(worker.id)} onChange={() => { }} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{worker.fullName}</p>
                                {worker.isLocked && <Lock className="w-3 h-3 text-red-500" />}
                              </div>
                              <p className="text-xs text-gray-500">{worker.role}</p>
                            </div>
                            {worker.isLocked && <span className="text-xs text-red-600 font-medium">{t('assignments.locked')}</span>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  {!isEditMode && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="lockWorkers" checked={lockWorkers} onChange={(e) => setLockWorkers(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                      <Label htmlFor="lockWorkers" className="cursor-pointer">{t('assignments.lockWorkersAfterAssign')}</Label>
                    </div>
                  )}
                  <div>
                    <Label>{t('assignments.notes')}</Label>
                    <Input placeholder={t('assignments.addNotes')} value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => handleDialogClose(false)} disabled={submitting}>{t('common.cancel')}</Button>
                    <Button onClick={handleCreateAssignment} disabled={submitting || selectedWorkers.length === 0} className="bg-brand-gradient hover:shadow-md text-white">
                      {submitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                      {isEditMode ? t('assignments.updateAssignment') : t('assignments.addAssignment')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-gray-900 font-semibold">
          {t('assignments.boardTitle')} - {selectedDate
            ? t('assignments.forDate', { date: new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) })
            : t('assignments.allAssignments')}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{selectedDate ? t('assignments.dragWorkersHint') : t('assignments.dragWorkersHintAll')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <Label className="mb-2 block text-sm text-gray-600">{t('assignments.assignmentDate')}</Label>
          <div className="flex gap-2">
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border-gray-300 focus:ring-brand-500 focus:border-brand-500" />
            <Button variant="outline" size="sm" onClick={() => setSelectedDate('')} className="whitespace-nowrap">{t('assignments.showAll')}</Button>
          </div>
          {!selectedDate && <p className="text-xs text-gray-500 mt-1">{t('assignments.showingAllAssignments')}</p>}
          {selectedDate && <p className="text-xs text-gray-500 mt-1">{t('assignments.filteredBy')} {selectedDate}</p>}
        </Card>
        <Card className="p-4 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">{t('assignments.assignmentsLabel')}</p>
            {isLoading && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
          </div>
          <p className="text-2xl font-semibold text-brand-600">{getAssignmentsCount()}</p>
          <p className="text-xs text-gray-400 mt-1">{selectedDate ? t('assignments.forDate', { date: new Date(selectedDate).toLocaleDateString() }) : t('assignments.totalActive')}</p>
        </Card>
        <Card className="p-4 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">{t('assignments.availableWorkers')}</p>
            {isLoading && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
          </div>
          <p className="text-2xl font-semibold text-brand-600">{getAvailableWorkersCount()}</p>
          <p className="text-xs text-gray-400 mt-1">{t('assignments.unlockedActive', { count: allWorkers.filter(w => w.isLocked).length })}</p>
        </Card>
        <Card className="p-4 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">{t('assignments.availableCars')}</p>
            {isLoading && <Loader className="w-3 h-3 animate-spin text-gray-400" />}
          </div>
          <p className="text-2xl font-semibold text-brand-600">{getAvailableCars().length}</p>
          <p className="text-xs text-gray-400 mt-1">{t('assignments.activeUnlocked', { count: allCars.filter(c => c.isLocked).length })}</p>
        </Card>
      </div>

      {/* Main board */}
      <div className="flex gap-6">
        {draggedWorker && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <p className="text-sm font-medium">{t('assignments.dragging', { name: draggedWorker.fullName })} <span className="ml-2">🎯 {t('assignments.dropOnSite')}</span></p>
          </div>
        )}

        {/* Workers Pool */}
        <div className="w-80 flex-shrink-0">
          <Card className="p-4 h-full bg-white border border-gray-200 shadow-sm">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">{t('assignments.availableWorkersPool', { count: availableWorkers.length })}</h3>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder={t('assignments.searchWorkers')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={handleMarkAllDayOff} disabled={isLoading || availableWorkers.filter(w => {
                  const has = assignments.some(a => !selectedDate ? a.workerId === w.id : a.workerId === w.id && new Date(a.assignedDate).toISOString().split('T')[0] === selectedDate);
                  return !has && !workersOnDayOff.includes(w.id);
                }).length === 0} className="w-full text-orange-600 hover:bg-orange-50 border-orange-200">
                  <Power className="w-4 h-4 mr-2" />{t('assignments.markAllDayOff')}
                </Button>
              )}
            </div>
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="space-y-2 pr-4">
                {availableWorkers.filter(w => w.fullName.toLowerCase().includes(searchQuery.toLowerCase()) && !workersOnDayOff.includes(w.id)).map(worker => {
                  const hasAssignment = assignments.some(a => !selectedDate ? a.workerId === worker.id : a.workerId === worker.id && new Date(a.assignedDate).toISOString().split('T')[0] === selectedDate);
                  return (
                    <div key={worker.id} draggable={canEdit} onDragStart={() => handleDragStart(worker)} onDragEnd={handleDragEnd}
                      className={`p-3 bg-white border border-gray-200 rounded-lg transition-all ${canEdit ? `cursor-move hover:shadow-md hover:border-brand-300 ${draggedWorker?.id === worker.id ? 'opacity-50 scale-95' : ''}` : 'cursor-default'}`}>
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">{worker.fullName.charAt(0).toUpperCase()}</div>
                            <p className="font-medium text-gray-900 truncate text-sm">{worker.fullName}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{worker.role}</p>
                        </div>
                        {canEdit && !hasAssignment && (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-100 flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleToggleDayOff(worker.id); }} disabled={isLoading} title={t('assignments.markDayOff')}>
                            <Power className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {workersOnDayOff.length > 0 && (
                  <>
                    <div className="pt-4 mt-4 border-t border-gray-300">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">{t('assignments.onDayOff', { count: workersOnDayOff.length })}</h4>
                    </div>
                    {allWorkers.filter(w => workersOnDayOff.includes(w.id) && w.fullName.toLowerCase().includes(searchQuery.toLowerCase())).map(worker => (
                      <div key={worker.id} className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">{worker.fullName.charAt(0).toUpperCase()}</div>
                              <p className="font-medium text-gray-600 truncate text-sm">{worker.fullName}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{worker.role}</p>
                          </div>
                          {canEdit && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:bg-green-100 hover:text-green-700 cursor-pointer flex-shrink-0 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={(e) => { e.stopPropagation(); handleToggleDayOff(worker.id); }} disabled={isLoading} title={t('assignments.markAvailable')}>
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

        {/* Sites Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSites.map(site => ({ site, siteAssignments: getSiteAssignments(site.id) }))
              .filter(({ siteAssignments }) => siteAssignments.length > 0)
              .map(({ site, siteAssignments }) => {
                const siteColor = site.name.includes('Tirana') ? 'blue' : site.name.includes('Durres') ? 'green' : site.name.includes('Vlore') ? 'orange' : 'purple';
                const isCompleted = isSiteCompleted(site);
                const canEditThisSite = canEditSite(site);
                return (
                  <Card key={site.id}
                    onDragOver={canEditThisSite ? handleDragOver : undefined}
                    onDragEnter={canEditThisSite ? () => handleDragEnter(site.id) : undefined}
                    onDragLeave={canEditThisSite ? handleDragLeave : undefined}
                    onDrop={canEditThisSite ? () => handleDropOnSite(site.id) : undefined}
                    className={`p-4 border-2 border-dashed transition-all ${isCompleted ? 'border-gray-300 bg-gray-50 opacity-75' : dragOverSite === site.id ? 'border-green-400 bg-green-50 shadow-lg scale-105' : draggedWorker && canEditThisSite ? 'border-brand-300 bg-white hover:border-brand-400 hover:shadow-md' : 'border-gray-300 bg-white hover:border-brand-400 hover:shadow-md'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-2 flex-1">
                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${isCompleted ? 'bg-gray-400' : `bg-${siteColor}-500`}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-semibold text-sm ${isCompleted ? 'text-gray-600' : 'text-gray-900'}`}>{site.name}</h3>
                            {isCompleted && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">✓ {t('assignments.siteComplete')}</span>}
                          </div>
                          <p className={`text-xs mt-0.5 ${isCompleted ? 'text-gray-500' : 'text-gray-600'}`}>{site.address}</p>
                          <p className={`text-xs mt-1 ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>📅 {selectedDate}</p>
                        </div>
                      </div>
                      {isCompleted && (
                        <Button variant="ghost" size="sm" onClick={() => toggleExpandedSite(site.id)} className="h-6 w-6 p-0 text-gray-600 hover:bg-gray-200 flex-shrink-0">
                          {expandedSites.has(site.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>

                    {siteAssignments.length > 0 && siteAssignments[0]?.carId && (
                      <div className={`mb-3 p-2 border rounded-lg flex items-center justify-between ${isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                        <p className={`text-xs font-medium ${isCompleted ? 'text-gray-600' : 'text-blue-700'}`}>
                          🚗 {allCars.find(c => c.id === siteAssignments[0].carId)?.name} - {allCars.find(c => c.id === siteAssignments[0].carId)?.number}
                        </p>
                        {canEditThisSite && siteAssignments[0]?.carId && (
                          allCars.find(c => c.id === siteAssignments[0].carId)?.isLocked ? (
                            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-orange-600 hover:bg-orange-100" onClick={() => handleUnlockCar(siteAssignments[0].carId!)} disabled={isLoading} title={t('assignments.unlockCar')}><Lock className="w-3 h-3" /></Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-orange-400 hover:bg-orange-100" onClick={() => handleLockCar(siteAssignments[0].carId!)} disabled={isLoading} title={t('assignments.lockCar')}><Unlock className="w-3 h-3" /></Button>
                          )
                        )}
                      </div>
                    )}

                    {siteAssignments.length === 0 ? (
                      <div className={`text-center py-8 transition-all ${isCompleted ? 'text-gray-400' : dragOverSite === site.id ? 'text-green-600' : 'text-gray-400'}`}>
                        <p className="text-sm font-medium">{isCompleted ? `✓ ${t('assignments.siteCompleted')}` : dragOverSite === site.id ? `✨ ${t('assignments.dropWorkerHere')}` : t('assignments.dropWorkersHere')}</p>
                        {!isCompleted && <p className="text-xs mt-1">or use {t('assignments.addAssignment')}</p>}
                      </div>
                    ) : (
                      <>
                        {isCompleted && !expandedSites.has(site.id) ? (
                          <div className="text-center py-4"><p className="text-xs text-gray-500">{t('assignments.workersAssigned', { count: siteAssignments.length })}</p></div>
                        ) : (
                          <div className="space-y-2">
                            {dragOverSite === site.id && !isCompleted && (
                              <div className="p-2 rounded-lg border-2 border-dashed border-green-400 bg-green-50 text-center">
                                <p className="text-sm font-medium text-green-600">{t('assignments.addWorkerToSite', { name: draggedWorker?.fullName || '' })}</p>
                              </div>
                            )}
                            {siteAssignments.map(assignment => {
                              const worker = assignment.worker;
                              if (!worker) return null;
                              return (
                                <div key={assignment.id} className={`p-2 rounded-lg border ${isCompleted ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-gray-50'}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${isCompleted ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-600'}`}>{worker.fullName.charAt(0).toUpperCase()}</div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-medium truncate text-xs ${isCompleted ? 'text-gray-600' : 'text-gray-900'}`}>{worker.fullName}</p>
                                      </div>
                                    </div>
                                    {canEditThisSite && (
                                      <div className="flex gap-1 flex-shrink-0">
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-600 hover:bg-gray-100" onClick={() => setViewAssignment(assignment)} title={t('assignments.viewDetails')}><Eye className="w-3 h-3" /></Button>
                                        {worker?.isLocked ? (
                                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600 hover:bg-green-100" onClick={() => handleUnlockWorker(worker.id)} disabled={isLoading} title={t('assignments.unlockWorker')}><Lock className="w-3 h-3" /></Button>
                                        ) : (
                                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600 hover:bg-red-100" onClick={() => handleLockWorker(worker.id)} disabled={isLoading} title={t('assignments.lockWorker')}><Unlock className="w-3 h-3" /></Button>
                                        )}
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600 hover:bg-red-100" onClick={() => handleDeleteAssignment(assignment.id)} disabled={isLoading} title={t('assignments.deleteAssignment')}><Trash2 className="w-3 h-3" /></Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {canEditThisSite && (
                              <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs text-brand-600 hover:bg-brand-50" onClick={() => handleEditAssignment(siteAssignments)}>
                                  <Edit className="w-3 h-3 mr-1" />{t('assignments.editAssignment')}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => handleDeleteSiteCard(site.id, siteAssignments)}>
                                  <Trash2 className="w-3 h-3 mr-1" />{t('assignments.deleteAll')}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                );
              })}
          </div>
        </div>
      </div>

      <AssignmentExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} assignments={assignments} />
      {viewAssignment && (
        <WorkerAssignmentDetailsDialog assignment={viewAssignment} isOpen={!!viewAssignment} onClose={() => setViewAssignment(null)} />
      )}
    </div>
  );
}
