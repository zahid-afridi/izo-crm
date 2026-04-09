'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Plus, Search, Trash2, Loader, Lock, Unlock, AlertCircle,
  GripVertical, Edit, Download, ChevronUp, ChevronDown, Eye,
  Power, CheckSquare, Flag, Car as CarIcon, Users,
} from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { AssignmentExportDialog } from './AssignmentExportDialog';
import { WorkerAssignmentDetailsDialog } from './WorkerAssignmentDetailsDialog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchAssignmentsData, fetchDailyProgramThunk, lockEntities,
  setWorkerLocked, setBulkWorkersLocked, setCarLocked, setWorkerDayOff,
  removeAssignment, removeAssignments, addAssignments,
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

const todayStr = () => new Date().toISOString().split('T')[0];

export function AssignmentsPage({ userRole }: AssignmentsPageProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const assignments = useAppSelector(selectAssignments);
  const allWorkers = useAppSelector(selectAllWorkers);
  const availableWorkers = useAppSelector(selectAvailableWorkers);
  const allCars = useAppSelector(selectAllCars);
  const allSites = useAppSelector(selectAllSites);
  const allTeams = useAppSelector(selectAllTeams);
  const workersOnDayOff = useAppSelector(selectWorkersOnDayOff);
  const isLoading = useAppSelector(selectAssignmentsIsLoading);
  const isInitialized = useAppSelector(selectAssignmentsIsInitialized);

  // Board date filter — default to empty (show all)
  const [selectedDate, setSelectedDate] = useState('');
  // Dialog state
  const [dialogDate, setDialogDate] = useState(todayStr());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editingAssignments, setEditingAssignments] = useState<Assignment[]>([]);
  // Form fields
  const [siteId, setSiteId] = useState('');
  const [carId, setCarId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [workerMode, setWorkerMode] = useState<'free' | 'locked'>('free');   // free = show in pool again
  const [carMode, setCarMode] = useState<'free' | 'locked'>('free');
  const [workerSearch, setWorkerSearch] = useState('');
  const [siteSearch, setSiteSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);   // single delete spinner
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null); // bulk delete spinner
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [draggedWorker, setDraggedWorker] = useState<AssignmentWorker | null>(null);
  const [dragOverSite, setDragOverSite] = useState<string | null>(null);
  const [viewAssignment, setViewAssignment] = useState<Assignment | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  // Day-off workers for the dialog date (fetched separately)
  const [dialogDayOff, setDialogDayOff] = useState<string[]>([]);
  // Finalize panel
  const [allowFullProgram, setAllowFullProgram] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [dailyProgramState, setDailyProgramState] = useState<{
    isFinalized: boolean; allowWorkersToSeeFullProgram: boolean; finalizedAt?: string;
  } | null>(null);

  const canEdit = ['admin', 'site_manager'].includes(userRole);

  useEffect(() => {
    dispatch(fetchAssignmentsData(selectedDate || undefined));
  }, [dispatch, selectedDate]);

  useEffect(() => {
    const date = selectedDate || todayStr();
    dispatch(fetchDailyProgramThunk(date));
    fetchDailyProgram(date).then(dp => {
      setDailyProgramState(dp);
      setAllowFullProgram(dp?.allowWorkersToSeeFullProgram ?? false);
    });
  }, [selectedDate, dispatch]);

  useEffect(() => {
    if (isCreateOpen && !isEditMode) {
      fetchDayOffForDate(dialogDate).then(setDialogDayOff);
    }
  }, [dialogDate, isCreateOpen, isEditMode]);

  const fetchDayOffForDate = async (date: string): Promise<string[]> => {
    try {
      const res = await fetch(`/api/daily-program?date=${date}`);
      if (!res.ok) return [];
      const d = await res.json();
      return d.workersOnDayOff || [];
    } catch { return []; }
  };

  const fetchDailyProgram = async (date: string) => {
    try {
      const res = await fetch(`/api/assignments/finalize-daily-program?date=${date}`);
      if (!res.ok) return null;
      const d = await res.json();
      return d.dailyProgram ?? null;
    } catch { return null; }
  };

  const refreshData = () => {
    dispatch(fetchAssignmentsData(selectedDate || undefined));
    const date = selectedDate || todayStr();
    dispatch(fetchDailyProgramThunk(date));
    fetchDailyProgram(date).then(dp => {
      setDailyProgramState(dp);
      setAllowFullProgram(dp?.allowWorkersToSeeFullProgram ?? false);
    });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getSiteAssignments = (sid: string) =>
    assignments.filter(a => {
      if (!selectedDate) return a.siteId === sid;
      return a.siteId === sid && new Date(a.assignedDate).toISOString().split('T')[0] === selectedDate;
    });

  const isSiteCompleted = (site: AssignmentSite) => site.status === 'completed';

  const getAvailableCars = () => {
    const active = allCars.filter(c => c.status === 'active' && !c.isLocked);
    if (isEditMode && carId) {
      const cur = allCars.find(c => c.id === carId);
      if (cur && !active.find(c => c.id === cur.id)) return [cur, ...active];
    }
    return active;
  };

  const getFilteredWorkers = (): AssignmentWorker[] => {
    const dayOff = isCreateOpen ? dialogDayOff : workersOnDayOff;
    let pool = availableWorkers.filter(w => !dayOff.includes(w.id));
    if (selectedTeam && selectedTeam !== 'all') {
      const team = allTeams.find((t: any) => t.id === selectedTeam);
      if (team) {
        const ids = new Set([team.teamLeadId, ...team.memberIds]);
        pool = pool.filter(w => ids.has(w.id));
      }
    }
    if (workerSearch) pool = pool.filter(w => w.fullName.toLowerCase().includes(workerSearch.toLowerCase()));
    return pool;
  };

  const filteredSites = useMemo(() =>
    allSites.filter(s =>
      s.name.toLowerCase().includes(siteSearch.toLowerCase()) ||
      s.address.toLowerCase().includes(siteSearch.toLowerCase())
    ), [allSites, siteSearch]);

  // Sites that already have assignments on the dialog date (for create mode — exclude from dropdown)
  const sitesWithAssignmentsOnDialogDate = useMemo(() => {
    if (isEditMode) return new Set<string>();
    return new Set(
      assignments
        .filter(a => new Date(a.assignedDate).toISOString().split('T')[0] === dialogDate)
        .map(a => a.siteId)
    );
  }, [assignments, dialogDate, isEditMode]);

  const availableSitesForDialog = useMemo(() =>
    allSites.filter(s => !isSiteCompleted(s) && !sitesWithAssignmentsOnDialogDate.has(s.id)),
    [allSites, sitesWithAssignmentsOnDialogDate]
  );

  // Pool is "empty" when all workers are locked (none in availableWorkers)
  const poolIsEmpty = availableWorkers.filter(w => !workersOnDayOff.includes(w.id)).length === 0;

  // ── Dialog open/close ─────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setIsEditMode(false);
    setEditingAssignment(null);
    setEditingAssignments([]);
    setSiteId(''); setCarId(''); setNotes('');
    setSelectedWorkers([]); setSelectedTeam('');
    setWorkerMode('free'); setCarMode('free');
    setWorkerSearch(''); setFormError('');
    setDialogDate(selectedDate || todayStr());
    setIsCreateOpen(true);
  };

  const closeDialog = () => {
    setIsCreateOpen(false);
    setFormError('');
    setWorkerSearch('');
  };

  const openEditDialog = (arr: Assignment[]) => {
    const first = arr[0];
    setIsEditMode(true);
    setEditingAssignment(first);
    setEditingAssignments(arr);
    setSiteId(first.siteId);
    setCarId(first.carId || '');
    setNotes(first.notes || '');
    setSelectedWorkers(arr.map(a => a.workerId).filter(id => allWorkers.some(w => w.id === id)));
    setSelectedTeam('');
    setWorkerMode('free'); setCarMode('free');
    setWorkerSearch(''); setFormError('');
    setDialogDate(new Date(first.assignedDate).toISOString().split('T')[0]);
    setIsCreateOpen(true);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setFormError('');
    if (!dialogDate || !siteId || selectedWorkers.length === 0) {
      setFormError('Date, site, and at least one worker are required.');
      return;
    }
    const validIds = selectedWorkers.filter(id => allWorkers.some(w => w.id === id && w.role === 'worker'));
    if (!validIds.length) { setFormError('No valid workers selected.'); return; }

    setSubmitting(true);
    try {
      if (isEditMode && editingAssignment) {
        const originalIds = editingAssignments.map(a => a.id);
        if (validIds.length === 1 && editingAssignments.length === 1 && validIds[0] === editingAssignments[0].workerId) {
          const res = await fetch(`/api/assignments/${editingAssignment.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteId, workerId: validIds[0], carId: carId || null, assignedDate: dialogDate, status: 'active', notes: notes || null }),
          });
          if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to update'); }
        } else {
          const res = await fetch('/api/assignments/bulk-update', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteId, workerIds: validIds, carId: carId || null, assignedDate: dialogDate, notes: notes || null, originalAssignmentIds: originalIds }),
          });
          if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to update'); }
        }
        toast.success('Assignment updated');
        // Refresh to get accurate state after edit
        dispatch(fetchAssignmentsData(selectedDate || undefined));
      } else {
        const res = await fetch('/api/assignments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, workerIds: validIds, carId: carId || null, assignedDate: dialogDate, status: 'active', notes: notes || null }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create'); }
        const data = await res.json();

        // Add to state directly — no full refresh
        const created: Assignment[] = (data.assignments ?? (data.assignment ? [data.assignment] : [])).map((a: any) => ({
          id: a.id,
          siteId: a.siteId,
          workerId: a.worker?.id ?? a.workerId,
          carId: a.car?.id ?? a.carId ?? undefined,
          assignedDate: typeof a.assignedDate === 'string' ? a.assignedDate : new Date(a.assignedDate).toISOString(),
          status: a.status,
          notes: a.notes ?? undefined,
          showAssignmentHistory: a.showAssignmentHistory ?? false,
          createdAt: a.createdAt ?? new Date().toISOString(),
          site: a.site ?? allSites.find(s => s.id === siteId) ?? { id: siteId, name: '', address: '', status: 'active' },
          worker: a.worker ?? allWorkers.find(w => w.id === a.workerId) ?? { id: a.workerId, fullName: '', email: '', role: 'worker', isLocked: false },
          car: a.car ?? undefined,
        }));
        if (created.length) dispatch(addAssignments(created));

        // Apply lock/free after creation
        if (carMode === 'locked' && carId) {
          dispatch(setCarLocked({ carId, isLocked: true }));
          dispatch(lockEntities({ type: 'car', ids: [carId], isLocked: true }));
        }
        if (workerMode === 'locked') {
          dispatch(setBulkWorkersLocked({ workerIds: validIds, isLocked: true }));
          dispatch(lockEntities({ type: 'worker', ids: validIds, isLocked: true }));
        }
        toast.success('Assignment created');
      }
      closeDialog();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save assignment');
      toast.error(err.message || 'Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      dispatch(removeAssignment(id));
      toast.success('Assignment deleted');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSite = async (sid: string, siteAssignments: Assignment[]) => {
    if (!confirm(`Delete all ${siteAssignments.length} assignments for this site?`)) return;
    setDeletingSiteId(sid);
    try {
      const ids = siteAssignments.map(a => a.id);
      const res = await fetch('/api/assignments/bulk-delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentIds: ids }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      dispatch(removeAssignments(ids));
      toast.success('Site assignments deleted');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingSiteId(null);
    }
  };

  // ── Lock/Unlock ───────────────────────────────────────────────────────────────

  const toggleWorkerLock = async (workerId: string, isLocked: boolean) => {
    dispatch(setWorkerLocked({ workerId, isLocked }));
    const res = await dispatch(lockEntities({ type: 'worker', ids: [workerId], isLocked }));
    if (lockEntities.rejected.match(res)) {
      dispatch(setWorkerLocked({ workerId, isLocked: !isLocked }));
      toast.error('Failed to update worker lock');
    } else {
      toast.success(isLocked ? 'Worker locked' : 'Worker unlocked');
    }
  };

  const toggleCarLock = async (cid: string, isLocked: boolean) => {
    dispatch(setCarLocked({ carId: cid, isLocked }));
    const res = await dispatch(lockEntities({ type: 'car', ids: [cid], isLocked }));
    if (lockEntities.rejected.match(res)) {
      dispatch(setCarLocked({ carId: cid, isLocked: !isLocked }));
      toast.error('Failed to update car lock');
    } else {
      toast.success(isLocked ? 'Car locked' : 'Car unlocked');
    }
  };

  // ── Day Off ───────────────────────────────────────────────────────────────────

  const handleToggleDayOff = async (workerId: string) => {
    try {
      const date = selectedDate || todayStr();
      const res = await fetch('/api/daily-program/toggle-day-off', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId, date }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      const data = await res.json();
      dispatch(setWorkerDayOff({ workerId, isOnDayOff: data.isOnDayOff }));
      toast.success(data.isOnDayOff ? 'Worker marked day off' : 'Worker now available');
      refreshData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleMarkAllDayOff = async () => {
    const unassigned = availableWorkers.filter(w => {
      const hasAssignment = assignments.some(a =>
        a.workerId === w.id && (!selectedDate || new Date(a.assignedDate).toISOString().split('T')[0] === selectedDate)
      );
      return !hasAssignment && !workersOnDayOff.includes(w.id);
    });
    if (!unassigned.length) { toast.info('No unassigned workers to mark day off'); return; }
    if (!confirm(`Mark ${unassigned.length} remaining pool workers as day off?`)) return;
    const date = selectedDate || todayStr();
    await Promise.all(unassigned.map(w =>
      fetch('/api/daily-program/toggle-day-off', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: w.id, date }),
      })
    ));
    toast.success(`${unassigned.length} workers marked as day off`);
    refreshData();
    dispatch(fetchDailyProgramThunk(date));
  };

  // ── Finalize ──────────────────────────────────────────────────────────────────

  const handleFinalize = async () => {
    if (!confirm(`Finalize the daily program for ${selectedDate || todayStr()}? This will save the current assignments.`)) return;
    setFinalizing(true);
    try {
      const date = selectedDate || todayStr();
      const res = await fetch('/api/assignments/finalize-daily-program', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, allowWorkersToSeeFullProgram: allowFullProgram }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to finalize'); }
      toast.success('Daily program finalized');
      refreshData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setFinalizing(false);
    }
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────────

  const handleDragStart = (worker: AssignmentWorker) => setDraggedWorker(worker);
  const handleDragEnd = () => { setDraggedWorker(null); setDragOverSite(null); };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragEnter = (sid: string) => {
    if (!draggedWorker || !canEdit) return;
    const site = allSites.find(s => s.id === sid);
    if (site && !isSiteCompleted(site)) setDragOverSite(sid);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
      setDragOverSite(null);
  };
  const handleDrop = async (sid: string) => {
    if (!draggedWorker || !canEdit) { setDraggedWorker(null); return; }
    const site = allSites.find(s => s.id === sid);
    if (site && isSiteCompleted(site)) { toast.error('Cannot assign to completed site'); setDraggedWorker(null); return; }
    const exists = assignments.some(a =>
      a.siteId === sid && a.workerId === draggedWorker.id &&
      (!selectedDate || new Date(a.assignedDate).toISOString().split('T')[0] === selectedDate)
    );
    if (exists) { toast.info(`${draggedWorker.fullName} already assigned`); setDraggedWorker(null); return; }
    try {
      const date = selectedDate || todayStr();
      const res = await fetch('/api/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: sid, workerIds: [draggedWorker.id], carId: null, assignedDate: date, status: 'active', notes: null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      const data = await res.json();
      const created: Assignment[] = (data.assignments ?? (data.assignment ? [data.assignment] : [])).map((a: any) => ({
        id: a.id,
        siteId: a.siteId,
        workerId: a.worker?.id ?? a.workerId,
        carId: a.car?.id ?? a.carId ?? undefined,
        assignedDate: typeof a.assignedDate === 'string' ? a.assignedDate : new Date(a.assignedDate).toISOString(),
        status: a.status,
        notes: a.notes ?? undefined,
        showAssignmentHistory: a.showAssignmentHistory ?? false,
        createdAt: a.createdAt ?? new Date().toISOString(),
        site: a.site ?? allSites.find(s => s.id === sid) ?? { id: sid, name: site?.name ?? '', address: site?.address ?? '', status: 'active' },
        worker: a.worker ?? allWorkers.find(w => w.id === draggedWorker!.id) ?? { id: draggedWorker!.id, fullName: draggedWorker!.fullName, email: '', role: 'worker', isLocked: false },
        car: a.car ?? undefined,
      }));
      if (created.length) dispatch(addAssignments(created));
      toast.success(`${draggedWorker.fullName} assigned to ${site?.name}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setDraggedWorker(null); }
  };

  if (isLoading && assignments.length === 0) {
    return <div className="flex items-center justify-center h-96"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-4 p-2 sm:p-4 lg:p-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Assignment Board</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedDate
              ? `${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
              : 'All assignments'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            {isLoading ? <Loader className="w-4 h-4 mr-1 animate-spin" /> : null}
            Refresh
          </Button>
          {canEdit && (
            <Button size="sm" className="bg-brand-gradient text-white" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-1" /> New Assignment
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Date picker */}
        <Card className="p-3 col-span-2 md:col-span-1">
          <Label className="text-xs text-gray-500 mb-1 block">Assignment Date</Label>
          <div className="flex gap-2">
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="text-sm h-8" />
            <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setSelectedDate(todayStr())}>Today</Button>
          </div>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-500">Sites Assigned</p>
          <p className="text-2xl font-semibold text-brand-600">
            {new Set(assignments.filter(a => !selectedDate || new Date(a.assignedDate).toISOString().split('T')[0] === selectedDate).map(a => a.siteId)).size}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-500">Pool Workers</p>
          <p className="text-2xl font-semibold text-brand-600">
            {availableWorkers.filter(w => !workersOnDayOff.includes(w.id)).length}
          </p>
          <p className="text-xs text-gray-400">{allWorkers.filter(w => w.isLocked).length} locked</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-500">Available Cars</p>
          <p className="text-2xl font-semibold text-brand-600">{getAvailableCars().length}</p>
          <p className="text-xs text-gray-400">{allCars.filter(c => c.isLocked).length} locked</p>
        </Card>
      </div>

      {/* ── Finalize Panel (shown when pool is empty or already finalized) ── */}
      {canEdit && (poolIsEmpty || dailyProgramState?.isFinalized) && (
        <Card className={`p-4 border-2 ${dailyProgramState?.isFinalized ? 'border-green-400 bg-green-50' : 'border-brand-400 bg-brand-50'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flag className={`w-5 h-5 ${dailyProgramState?.isFinalized ? 'text-green-600' : 'text-brand-600'}`} />
                <h3 className="font-semibold text-gray-900">
                  {dailyProgramState?.isFinalized ? 'Program Finalized' : 'Ready to Finalize'}
                </h3>
                {dailyProgramState?.isFinalized && (
                  <Badge className="bg-green-100 text-green-700 border-green-300">Finalized</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {dailyProgramState?.isFinalized
                  ? `Finalized at ${dailyProgramState.finalizedAt ? new Date(dailyProgramState.finalizedAt).toLocaleTimeString() : ''}`
                  : 'All workers are assigned. You can now finalize the daily program.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowFullProgram}
                  onChange={e => setAllowFullProgram(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600"
                />
                <span className="text-sm text-gray-700">Allow workers to see full program</span>
              </label>
              <Button
                onClick={handleFinalize}
                disabled={finalizing}
                className={`${dailyProgramState?.isFinalized ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-gradient'} text-white`}
              >
                {finalizing && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                <Flag className="w-4 h-4 mr-2" />
                {dailyProgramState?.isFinalized ? 'Re-Finalize' : 'Finalize Program'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Main Board ── */}
      <div className="flex gap-4">
        {draggedWorker && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
            Dragging {draggedWorker.fullName} — drop on a site
          </div>
        )}

        {/* Workers Pool */}
        <div className="hidden md:flex flex-col w-72 flex-shrink-0 gap-3">
          <Card className="p-4 bg-white border border-gray-200 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                Workers Pool
                <Badge variant="secondary">{availableWorkers.filter(w => !workersOnDayOff.includes(w.id)).length}</Badge>
              </h3>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search workers..." value={siteSearch} onChange={e => setSiteSearch(e.target.value)} className="pl-9 h-8 text-sm" />
            </div>
            {canEdit && (
              <Button
                variant="outline" size="sm"
                onClick={handleMarkAllDayOff}
                disabled={isLoading}
                className="w-full mb-3 text-orange-600 hover:bg-orange-50 border-orange-200 text-xs"
              >
                <Power className="w-3 h-3 mr-1" /> Mark All Remaining Day Off
              </Button>
            )}
            <ScrollArea className="h-[calc(100vh-480px)]">
              <div className="space-y-1.5 pr-2">
                {availableWorkers
                  .filter(w => !workersOnDayOff.includes(w.id) && w.fullName.toLowerCase().includes(siteSearch.toLowerCase()))
                  .map(worker => (
                    <div
                      key={worker.id}
                      draggable={canEdit}
                      onDragStart={() => handleDragStart(worker)}
                      onDragEnd={handleDragEnd}
                      className={`p-2.5 bg-white border rounded-lg transition-all ${canEdit ? 'cursor-move hover:shadow-sm hover:border-brand-300' : 'cursor-default'} ${draggedWorker?.id === worker.id ? 'opacity-40 scale-95' : ''} ${worker.isLocked ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
                        <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {worker.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{worker.fullName}</p>
                        </div>
                        {worker.isLocked && <Lock className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                        {canEdit && (
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-orange-500 hover:bg-orange-100 flex-shrink-0"
                            onClick={e => { e.stopPropagation(); handleToggleDayOff(worker.id); }}
                            title="Mark day off"
                          >
                            <Power className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                {/* Day Off section */}
                {workersOnDayOff.length > 0 && (
                  <div className="pt-3 mt-2 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Day Off ({workersOnDayOff.length})</p>
                    {allWorkers
                      .filter(w => workersOnDayOff.includes(w.id) && w.fullName.toLowerCase().includes(siteSearch.toLowerCase()))
                      .map(worker => (
                        <div key={worker.id} className="p-2.5 bg-gray-100 border border-gray-200 rounded-lg mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {worker.fullName.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm text-gray-500 flex-1 truncate">{worker.fullName}</p>
                            {canEdit && (
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-green-600 hover:bg-green-100 flex-shrink-0"
                                onClick={e => { e.stopPropagation(); handleToggleDayOff(worker.id); }}
                                title="Mark available"
                              >
                                <Power className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Sites Grid */}
        <div className="flex-1 min-w-0">
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search sites..." value={siteSearch} onChange={e => setSiteSearch(e.target.value)} className="pl-9 h-8 text-sm" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSites
              .map(site => ({ site, siteAssignments: getSiteAssignments(site.id) }))
              .filter(({ siteAssignments }) => siteAssignments.length > 0)
              .map(({ site, siteAssignments }) => {
                const isCompleted = isSiteCompleted(site);
                const canEditSite = canEdit && !isCompleted;
                const expanded = expandedSites.has(site.id);
                const carForSite = siteAssignments[0]?.carId ? allCars.find(c => c.id === siteAssignments[0].carId) : null;

                return (
                  <Card
                    key={site.id}
                    onDragOver={canEditSite ? handleDragOver : undefined}
                    onDragEnter={canEditSite ? () => handleDragEnter(site.id) : undefined}
                    onDragLeave={canEditSite ? handleDragLeave : undefined}
                    onDrop={canEditSite ? () => handleDrop(site.id) : undefined}
                    className={`p-4 border-2 transition-all ${isCompleted ? 'border-gray-200 bg-gray-50 opacity-80' : dragOverSite === site.id ? 'border-green-400 bg-green-50 shadow-lg scale-[1.02]' : draggedWorker && canEditSite ? 'border-brand-300 bg-white' : 'border-gray-200 bg-white hover:border-brand-300 hover:shadow-sm'}`}
                  >
                    {/* Site header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${isCompleted ? 'bg-gray-400' : 'bg-brand-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm text-gray-900 truncate">{site.name}</h3>
                            {isCompleted && <Badge className="bg-green-100 text-green-700 text-xs">Completed</Badge>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{site.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs">{siteAssignments.length} workers</Badge>
                        {isCompleted && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpandedSites(prev => { const s = new Set(prev); s.has(site.id) ? s.delete(site.id) : s.add(site.id); return s; })}>
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Car row */}
                    {carForSite && (
                      <div className={`mb-3 px-3 py-2 rounded-lg flex items-center justify-between ${isCompleted ? 'bg-gray-100' : 'bg-blue-50 border border-blue-100'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: carForSite.color }} />
                          <span className="text-xs font-medium text-gray-700">{carForSite.name} · {carForSite.number}</span>
                        </div>
                        {canEditSite && (
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0"
                            onClick={() => toggleCarLock(carForSite.id, !carForSite.isLocked)}
                            title={carForSite.isLocked ? 'Unlock car' : 'Lock car'}
                          >
                            {carForSite.isLocked ? <Lock className="w-3 h-3 text-orange-500" /> : <Unlock className="w-3 h-3 text-gray-400" />}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Workers list */}
                    {(!isCompleted || expanded) && (
                      <div className="space-y-1.5">
                        {dragOverSite === site.id && (
                          <div className="p-2 rounded-lg border-2 border-dashed border-green-400 bg-green-50 text-center text-xs text-green-600 font-medium">
                            Drop {draggedWorker?.fullName} here
                          </div>
                        )}
                        {siteAssignments.map(assignment => {
                          const worker = assignment.worker;
                          if (!worker) return null;
                          return (
                            <div key={assignment.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                              <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                {worker.fullName.charAt(0).toUpperCase()}
                              </div>
                              <p className="text-xs font-medium text-gray-900 flex-1 truncate">{worker.fullName}</p>
                              {canEditSite && (
                                <div className="flex gap-0.5 flex-shrink-0">
                                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-gray-500 hover:bg-gray-200"
                                    onClick={() => setViewAssignment(assignment)} title="View details">
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0"
                                    onClick={() => toggleWorkerLock(worker.id, !worker.isLocked)}
                                    title={worker.isLocked ? 'Unlock worker' : 'Lock worker'}>
                                    {worker.isLocked
                                      ? <Lock className="w-3 h-3 text-orange-500" />
                                      : <Unlock className="w-3 h-3 text-gray-400" />}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-500 hover:bg-red-50"
                                    onClick={() => handleDelete(assignment.id)} title="Remove"
                                    disabled={deletingId === assignment.id}>
                                    {deletingId === assignment.id
                                      ? <Loader className="w-3 h-3 animate-spin" />
                                      : <Trash2 className="w-3 h-3" />}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {canEditSite && (
                          <div className="flex gap-2 pt-2 border-t border-gray-100">
                            <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs text-brand-600 hover:bg-brand-50"
                              onClick={() => openEditDialog(siteAssignments)}>
                              <Edit className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteSite(site.id, siteAssignments)}
                              disabled={deletingSiteId === site.id}>
                              {deletingSiteId === site.id
                                ? <Loader className="w-3 h-3 mr-1 animate-spin" />
                                : <Trash2 className="w-3 h-3 mr-1" />}
                              Delete All
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    {isCompleted && !expanded && (
                      <p className="text-xs text-gray-400 text-center py-2">{siteAssignments.length} workers assigned</p>
                    )}
                  </Card>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Assignment' : 'New Assignment'}</DialogTitle>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 mt-2">
            {/* Date + Site */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm mb-1 block">Assignment Date *</Label>
                <Input type="date" value={dialogDate} onChange={e => setDialogDate(e.target.value)} className="text-sm" />
              </div>
              <div>
                <Label className="text-sm mb-1 block">Construction Site *</Label>
                {isEditMode ? (
                  <Input value={editingAssignment?.site?.name || ''} disabled className="bg-gray-100 text-sm" />
                ) : (
                  <Select value={siteId} onValueChange={setSiteId}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select site" /></SelectTrigger>
                    <SelectContent>
                      {availableSitesForDialog.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-sm">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Car + Car mode */}
            <div className="space-y-2">
              <Label className="text-sm mb-1 block">Assign Car (optional)</Label>
              <Select value={carId || 'none'} onValueChange={v => setCarId(v === 'none' ? '' : v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="No car" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">No car</SelectItem>
                  {getAvailableCars().map(car => (
                    <SelectItem key={car.id} value={car.id} className="text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block border" style={{ backgroundColor: car.color }} />
                        {car.name} · {car.number}
                        {car.isLocked && ' 🔒'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {carId && !isEditMode && (
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="carMode" value="free" checked={carMode === 'free'} onChange={() => setCarMode('free')} className="text-brand-600" />
                    <span className="text-green-700 font-medium">Free</span>
                    <span className="text-xs text-gray-500">— car stays in pool for next assignment</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="carMode" value="locked" checked={carMode === 'locked'} onChange={() => setCarMode('locked')} className="text-brand-600" />
                    <span className="text-orange-700 font-medium">Locked</span>
                    <span className="text-xs text-gray-500">— removed from pool</span>
                  </label>
                </div>
              )}
            </div>

            {/* Workers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Select Workers *</Label>
                <button onClick={() => setSelectedWorkers([])} className="text-xs text-brand-600 hover:text-brand-700">
                  Clear ({selectedWorkers.length})
                </button>
              </div>

              {/* Team filter */}
              <Select value={selectedTeam} onValueChange={v => {
                setSelectedTeam(v);
                if (v === 'all') setSelectedWorkers(availableWorkers.map(w => w.id));
                else if (v === 'none') setSelectedWorkers([]);
                else {
                  const team = allTeams.find((t: any) => t.id === v);
                  if (team) setSelectedWorkers([...new Set([team.teamLeadId, ...team.memberIds])]);
                }
              }}>
                <SelectTrigger className="text-sm mb-2"><SelectValue placeholder="Filter by team (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All workers</SelectItem>
                  <SelectItem value="none" className="text-sm">Clear selection</SelectItem>
                  {allTeams.filter((t: any) => t.status === 'active').map((t: any) => (
                    <SelectItem key={t.id} value={t.id} className="text-sm">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search workers..." value={workerSearch} onChange={e => setWorkerSearch(e.target.value)} className="pl-9 text-sm h-8" />
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {getFilteredWorkers().map(worker => (
                  <div
                    key={worker.id}
                    onClick={() => setSelectedWorkers(prev => prev.includes(worker.id) ? prev.filter(id => id !== worker.id) : [...prev, worker.id])}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${selectedWorkers.includes(worker.id) ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'} ${worker.isLocked ? 'opacity-60' : ''}`}
                  >
                    <input type="checkbox" checked={selectedWorkers.includes(worker.id)} onChange={() => { }} className="w-4 h-4 rounded border-gray-300 text-brand-600 pointer-events-none" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900 truncate">{worker.fullName}</p>
                        {worker.isLocked && <Lock className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                      </div>
                    </div>
                    {worker.isLocked && <span className="text-xs text-orange-600">locked</span>}
                  </div>
                ))}
                {isEditMode && editingAssignments.map(a => {
                  const w = allWorkers.find(x => x.id === a.workerId);
                  if (!w || getFilteredWorkers().find(x => x.id === w.id)) return null;
                  return (
                    <div key={w.id}
                      onClick={() => setSelectedWorkers(prev => prev.includes(w.id) ? prev.filter(id => id !== w.id) : [...prev, w.id])}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer ${selectedWorkers.includes(w.id) ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <input type="checkbox" checked={selectedWorkers.includes(w.id)} onChange={() => { }} className="w-4 h-4 rounded border-gray-300 text-brand-600 pointer-events-none" />
                      <p className="text-sm font-medium text-gray-900 flex-1 truncate">{w.fullName}</p>
                      <span className="text-xs text-blue-600">current</span>
                    </div>
                  );
                })}
              </div>

              {/* Worker free/locked mode */}
              {!isEditMode && selectedWorkers.length > 0 && (
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="workerMode" value="free" checked={workerMode === 'free'} onChange={() => setWorkerMode('free')} className="text-brand-600" />
                    <span className="text-green-700 font-medium">Free</span>
                    <span className="text-xs text-gray-500">— stays in pool for other sites</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="workerMode" value="locked" checked={workerMode === 'locked'} onChange={() => setWorkerMode('locked')} className="text-brand-600" />
                    <span className="text-orange-700 font-medium">Locked</span>
                    <span className="text-xs text-gray-500">— removed from pool</span>
                  </label>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm mb-1 block">Notes (optional)</Label>
              <Input placeholder="Add notes..." value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={closeDialog} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || selectedWorkers.length === 0} className="bg-brand-gradient text-white">
                {submitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                {isEditMode ? 'Update Assignment' : 'Create Assignment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AssignmentExportDialog isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} assignments={assignments} />
      {viewAssignment && (
        <WorkerAssignmentDetailsDialog assignment={viewAssignment} isOpen={!!viewAssignment} onClose={() => setViewAssignment(null)} />
      )}
    </div>
  );
}
