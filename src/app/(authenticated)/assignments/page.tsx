'use client';


import { useEffect, useMemo, useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSites } from '@/store/slices/sitesSlice';
import { selectAllSites, selectSitesIsLoading } from '@/store/selectors/sitesSelectors';
import { fetchWorkers } from '@/store/slices/workersSlice';
import { selectAllWorkers, selectWorkersIsInitialized, selectWorkersIsLoading } from '@/store/selectors/workersSelectors';
import { fetchCars } from '@/store/slices/carsSlice';
import { selectAllCars, selectCarsIsInitialized, selectCarsIsLoading } from '@/store/selectors/carsSelectors';
import {
  Calendar,
  Search,
  Plus,
  ChevronDown,
  Send,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export default function AssignmentsRoute() {
  type WorkerBasic = { id: string; name: string; role: string };
  type AssignedWorker = WorkerBasic & { time: string };
  type LeaveStatus = 'Unpaid Day Off' | 'Paid Day Off' | 'No status';
  type RemainingWorker = WorkerBasic & { status: LeaveStatus };

  type CarBasic = { id: string; name: string; type: string };
  type AssignedCar = CarBasic & { time: string };

  type DraftDay = {
    id: string;
    date: string; // YYYY-MM-DD
    siteName: string;
    timeRange: string;
    assignedWorkers: AssignedWorker[];
    assignedCars: AssignedCar[];
    remainingLeave: Array<{ name: string; status: LeaveStatus }>;
    published: boolean;
    publishedAt?: string;
  };

  const formatDateInput = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayDate = new Date();
  const TODAY_DATE = formatDateInput(todayDate);
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const DEFAULT_DATE = formatDateInput(tomorrowDate);
  const defaultRangeEndDate = new Date(tomorrowDate);
  defaultRangeEndDate.setDate(defaultRangeEndDate.getDate() + 1);
  const DEFAULT_RANGE_END = formatDateInput(defaultRangeEndDate);

  const dispatch = useAppDispatch();
  const reduxSites = useAppSelector(selectAllSites);
  const sitesLoading = useAppSelector(selectSitesIsLoading);
  const reduxWorkers = useAppSelector(selectAllWorkers);
  const workersLoading = useAppSelector(selectWorkersIsLoading);
  const workersInitialized = useAppSelector(selectWorkersIsInitialized);
  const reduxCars = useAppSelector(selectAllCars);
  const carsLoading = useAppSelector(selectCarsIsLoading);
  const carsInitialized = useAppSelector(selectCarsIsInitialized);

  const initialAssignedWorkers: AssignedWorker[] = [];

  const initialAssignedCars: AssignedCar[] = [];

  const [selectedSiteName, setSelectedSiteName] = useState<string>('');
  const [sitesQuery, setSitesQuery] = useState('');
  const [siteStatusFilter, setSiteStatusFilter] = useState<'all' | 'active' | 'unassigned'>('all');
  const [assignedSiteIdsForSelectedDate, setAssignedSiteIdsForSelectedDate] = useState<string[]>([]);
  const [workerAssignmentsByDate, setWorkerAssignmentsByDate] = useState<
    Record<string, Array<{ siteName: string; timeRange: string }>>
  >({});

  const [selectedDate, setSelectedDate] = useState<string>(DEFAULT_DATE);

  const [assignTab, setAssignTab] = useState<'day' | 'range'>('day');
  const [rangeStart, setRangeStart] = useState<string>(DEFAULT_DATE);
  const [rangeEnd, setRangeEnd] = useState<string>(DEFAULT_RANGE_END);

  const [timeRangeForAdd, setTimeRangeForAdd] = useState<string>('08:00 - 16:00');

  const [assignedWorkers, setAssignedWorkers] = useState<AssignedWorker[]>(initialAssignedWorkers);
  const [leaveStatusByWorker, setLeaveStatusByWorker] = useState<Record<string, LeaveStatus>>({});

  const [assignedCars, setAssignedCars] = useState<AssignedCar[]>(initialAssignedCars);

  const [availableQuery, setAvailableQuery] = useState('');
  const [assignedQuery, setAssignedQuery] = useState('');
  const [remainingQuery, setRemainingQuery] = useState('');
  const [carQuery, setCarQuery] = useState('');

  const [poolTab, setPoolTab] = useState<'available' | 'remaining' | 'cars'>('available');
  const [assignedView, setAssignedView] = useState<'workers' | 'cars'>('workers');

  const [draftsOpen, setDraftsOpen] = useState(false);
  const [draftsModalMode, setDraftsModalMode] = useState<'draft' | 'published'>('draft');
  const [isPublishingAllDrafts, setIsPublishingAllDrafts] = useState(false);
  const [addWorkersOpen, setAddWorkersOpen] = useState(false);
  const [addWorkersQuery, setAddWorkersQuery] = useState('');
  const [selectedWorkerIdsForAdd, setSelectedWorkerIdsForAdd] = useState<string[]>([]);
  const [isAddingWorkersFromModal, setIsAddingWorkersFromModal] = useState(false);
  const [allAssignmentsFilterDate, setAllAssignmentsFilterDate] = useState<string>(DEFAULT_DATE);
  const [drafts, setDrafts] = useState<DraftDay[]>([]);
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null);
  const [currentAssignmentStatus, setCurrentAssignmentStatus] = useState<'draft' | 'published' | null>(null);
  const [isLoadingSelectedAssignment, setIsLoadingSelectedAssignment] = useState(false);
  const [workerAction, setWorkerAction] = useState<{
    workerId: string;
    type: 'add' | 'remove' | 'time';
  } | null>(null);
  const [carAction, setCarAction] = useState<{
    carId: string;
    type: 'add' | 'remove' | 'time';
  } | null>(null);
  const [conflictWorker, setConflictWorker] = useState<WorkerBasic | null>(null);
  const [conflictStartTime, setConflictStartTime] = useState('08:00');
  const [conflictEndTime, setConflictEndTime] = useState('16:00');
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  const assignmentSites = useMemo(
    () =>
      reduxSites.map((site) => ({
        id: site.id,
        name: site.name,
        assigned: site.assignedWorkers ?? 0,
        status: site.status,
      })),
    [reduxSites]
  );

  const filteredSites = useMemo(() => {
    const q = sitesQuery.trim().toLowerCase();
    const assignedSiteIdSet = new Set(assignedSiteIdsForSelectedDate);

    return assignmentSites.filter((site) => {
      const matchesSearch = !q || site.name.toLowerCase().includes(q);
      const matchesStatus =
        siteStatusFilter === 'all' ||
        (siteStatusFilter === 'active' && assignedSiteIdSet.has(site.id)) ||
        (siteStatusFilter === 'unassigned' && !assignedSiteIdSet.has(site.id));
      return matchesSearch && matchesStatus;
    });
  }, [assignmentSites, sitesQuery, siteStatusFilter, assignedSiteIdsForSelectedDate]);

  useEffect(() => {
    dispatch(fetchSites({ status: 'active' }));
  }, [dispatch]);

  useEffect(() => {
    if ((poolTab === 'available' || poolTab === 'remaining') && !workersInitialized && !workersLoading) {
      dispatch(fetchWorkers({ status: 'active', page: 1, pageSize: 200 }));
    }
    if (poolTab === 'cars' && !carsInitialized && !carsLoading) {
      dispatch(fetchCars());
    }
  }, [poolTab, workersInitialized, workersLoading, carsInitialized, carsLoading, dispatch]);

  useEffect(() => {
    if (addWorkersOpen && !workersInitialized && !workersLoading) {
      dispatch(fetchWorkers({ status: 'active', page: 1, pageSize: 200 }));
    }
  }, [addWorkersOpen, workersInitialized, workersLoading, dispatch]);

  useEffect(() => {
    if (!assignmentSites.length) {
      if (selectedSiteName) setSelectedSiteName('');
      return;
    }

    const currentSelected = assignmentSites.find((site) => site.name === selectedSiteName);
    const fallbackSite = assignmentSites[0];

    if (!selectedSiteName || !currentSelected) {
      setSelectedSiteName(fallbackSite.name);
    }
  }, [assignmentSites, selectedSiteName]);

  useEffect(() => {
    if (!filteredSites.length) return;
    const selectedInFiltered = filteredSites.some((site) => site.name === selectedSiteName);
    if (!selectedInFiltered) {
      setSelectedSiteName(filteredSites[0].name);
    }
  }, [filteredSites, selectedSiteName]);

  const workerPool = useMemo<WorkerBasic[]>(
    () =>
      reduxWorkers
        .filter((w) => String(w.role).toLowerCase() === 'worker')
        .map((w) => ({
          id: w.id,
          name: w.fullName,
          role: w.worker?.employeeType || 'Worker',
        })),
    [reduxWorkers]
  );

  const availableWorkersPool = useMemo(() => workerPool, [workerPool]);

  const remainingWorkersPool = useMemo<RemainingWorker[]>(
    () =>
      workerPool
        .filter((w) => !workerAssignmentsByDate[w.id]?.length)
        .map((w) => ({
        ...w,
        status: leaveStatusByWorker[w.id] || 'No status',
      })),
    [workerPool, leaveStatusByWorker, workerAssignmentsByDate]
  );

  const carPool = useMemo<CarBasic[]>(
    () =>
      reduxCars.map((car) => ({
        id: car.id,
        name: car.name,
        type: [car.model, car.number].filter(Boolean).join(' • ') || 'Car',
      })),
    [reduxCars]
  );

  const assignedCarIds = useMemo(() => new Set(assignedCars.map((c) => c.id)), [assignedCars]);

  const availableCarsPool = useMemo(
    () => carPool.filter((c) => !assignedCarIds.has(c.id)),
    [carPool, assignedCarIds]
  );

  const statusBadge = (status: string) => {
    const normalized = status.toLowerCase();
    const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    if (normalized === 'active') {
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{label}</Badge>;
    }
    if (normalized === 'pending') {
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{label}</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">{label}</Badge>;
  };

  function parseYMD(ymd: string) {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatYMD(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDays(ymd: string, days: number) {
    const dt = parseYMD(ymd);
    dt.setDate(dt.getDate() + days);
    return formatYMD(dt);
  }

  function getDateRangeInclusive(start: string, end: string) {
    const startDt = parseYMD(start);
    const endDt = parseYMD(end);
    if (startDt > endDt) return [];
    const days: string[] = [];
    const cur = new Date(startDt);
    while (cur <= endDt) {
      days.push(formatYMD(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }

  function format12HourLabel(value: string) {
    const [h, m] = value.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  const timeOptions = useMemo(() => {
    const out: Array<{ value: string; label: string }> = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 30]) {
        const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        out.push({ value, label: format12HourLabel(value) });
      }
    }
    return out;
  }, []);

  function parseTimeRangeValue(value?: string | null) {
    const raw = String(value || '').trim();
    const [leftRaw = '', rightRaw = ''] = raw.split('-').map((x) => x.trim());
    const hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const start = hhmm.test(leftRaw) ? leftRaw : '08:00';
    const end = hhmm.test(rightRaw) ? rightRaw : '16:00';
    return { start, end };
  }

  function buildTimeRange(start: string, end: string) {
    return `${start} - ${end}`;
  }

  function formatTimeRange12h(range: string) {
    const { start, end } = parseTimeRangeValue(range);
    return `${format12HourLabel(start)} - ${format12HourLabel(end)}`;
  }

  function TimeRangePicker({
    value,
    onChange,
    disabled = false,
  }: {
    value: string;
    onChange: (next: string) => void;
    disabled?: boolean;
  }) {
    const { start, end } = parseTimeRangeValue(value);
    return (
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <select
          value={start}
          onChange={(e) => onChange(buildTimeRange(e.target.value, end))}
          disabled={disabled}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {timeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-gray-400 text-sm text-center">to</span>
        <select
          value={end}
          onChange={(e) => onChange(buildTimeRange(start, e.target.value))}
          disabled={disabled}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {timeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function toMinutes(hhmm: string) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function parseTimeRangeToMinutes(range: string) {
    const { start, end } = parseTimeRangeValue(range);
    return { startMin: toMinutes(start), endMin: toMinutes(end) };
  }

  function minutesToHHmm(totalMinutes: number) {
    const normalized = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1));
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function rangesOverlap(
    a: { startMin: number; endMin: number },
    b: { startMin: number; endMin: number }
  ) {
    return a.startMin < b.endMin && b.startMin < a.endMin;
  }

  function formatMinutesTo12h(totalMinutes: number) {
    const clamped = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  function describeAvailabilityWindows(
    busyRanges: Array<{ startMin: number; endMin: number }>
  ) {
    if (!busyRanges.length) return 'Available all day';

    const sorted = [...busyRanges].sort((a, b) => a.startMin - b.startMin);
    const merged: Array<{ startMin: number; endMin: number }> = [];
    for (const r of sorted) {
      const last = merged[merged.length - 1];
      if (!last || r.startMin > last.endMin) {
        merged.push({ ...r });
      } else {
        last.endMin = Math.max(last.endMin, r.endMin);
      }
    }

    if (merged.length === 1) {
      const one = merged[0];
      if (one.startMin > 0 && one.endMin < 24 * 60) {
        return `Available before ${formatMinutesTo12h(one.startMin)} and after ${formatMinutesTo12h(one.endMin)}`;
      }
      if (one.startMin > 0) {
        return `Available before ${formatMinutesTo12h(one.startMin)}`;
      }
      if (one.endMin < 24 * 60) {
        return `Available after ${formatMinutesTo12h(one.endMin)}`;
      }
      return 'No remaining availability today';
    }

    const freeWindows: string[] = [];
    let cursor = 0;
    for (const r of merged) {
      if (r.startMin > cursor) {
        freeWindows.push(`${formatMinutesTo12h(cursor)} - ${formatMinutesTo12h(r.startMin)}`);
      }
      cursor = Math.max(cursor, r.endMin);
    }
    if (cursor < 24 * 60) {
      freeWindows.push(`${formatMinutesTo12h(cursor)} - ${formatMinutesTo12h(24 * 60 - 1)}`);
    }
    return freeWindows.length ? `Available: ${freeWindows.join(', ')}` : 'No remaining availability today';
  }

  function getOtherAssignmentsForWorker(workerId: string) {
    const assignments = workerAssignmentsByDate[workerId] || [];
    return assignments.filter((a) => a.siteName !== selectedSiteName);
  }

  function getBusyRangesForWorker(workerId: string) {
    return getOtherAssignmentsForWorker(workerId).map((a) => parseTimeRangeToMinutes(a.timeRange));
  }

  function hasTimeConflictWithOtherSites(workerId: string, start: string, end: string) {
    const startMin = toMinutes(start);
    const endMin = toMinutes(end);
    if (endMin <= startMin) return true;
    const candidate = { startMin, endMin };
    return getBusyRangesForWorker(workerId).some((busy) => rangesOverlap(candidate, busy));
  }

  function findSuggestedNonConflictingRange(workerId: string) {
    const target = parseTimeRangeToMinutes(timeRangeForAdd);
    const duration = Math.max(30, target.endMin - target.startMin);
    const busyRanges = getBusyRangesForWorker(workerId).sort((a, b) => a.startMin - b.startMin);
    const merged: Array<{ startMin: number; endMin: number }> = [];

    for (const r of busyRanges) {
      const last = merged[merged.length - 1];
      if (!last || r.startMin > last.endMin) {
        merged.push({ ...r });
      } else {
        last.endMin = Math.max(last.endMin, r.endMin);
      }
    }

    let cursor = 0;
    for (const r of merged) {
      if (r.startMin - cursor >= duration) {
        return {
          start: minutesToHHmm(cursor),
          end: minutesToHHmm(cursor + duration),
        };
      }
      cursor = Math.max(cursor, r.endMin);
    }
    if (24 * 60 - cursor >= duration) {
      return {
        start: minutesToHHmm(cursor),
        end: minutesToHHmm(cursor + duration),
      };
    }
    return null;
  }

  const filteredAvailableWorkers = useMemo(() => {
    const q = availableQuery.trim().toLowerCase();
    if (!q) return availableWorkersPool;
    return availableWorkersPool.filter((w) => w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q));
  }, [availableWorkersPool, availableQuery]);

  const filteredAssignedWorkers = useMemo(() => {
    const q = assignedQuery.trim().toLowerCase();
    if (!q) return assignedWorkers;
    return assignedWorkers.filter((w) => w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q));
  }, [assignedWorkers, assignedQuery]);

  const filteredRemainingWorkers = useMemo(() => {
    const q = remainingQuery.trim().toLowerCase();
    if (!q) return remainingWorkersPool;
    return remainingWorkersPool.filter((w) => w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q));
  }, [remainingWorkersPool, remainingQuery]);

  const filteredCars = useMemo(() => {
    const q = carQuery.trim().toLowerCase();
    if (!q) return availableCarsPool;
    return availableCarsPool.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [availableCarsPool, carQuery]);

  const modalWorkerOptions = useMemo(() => {
    const q = addWorkersQuery.trim().toLowerCase();
    if (!q) return availableWorkersPool;
    return availableWorkersPool.filter(
      (w) => w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q)
    );
  }, [availableWorkersPool, addWorkersQuery]);

  const workerAvailabilityMetaById = useMemo(() => {
    const meta: Record<
      string,
      {
        assignedSiteName?: string;
        alreadyAssignedInSelectedSite?: boolean;
        hasOverlap: boolean;
        canAdd: boolean;
        message?: string;
      }
    > = {};

    const targetRange = parseTimeRangeToMinutes(timeRangeForAdd);
    const selectedRange = parseTimeRangeValue(timeRangeForAdd);

    for (const worker of workerPool) {
      const assignments = workerAssignmentsByDate[worker.id] || [];
      const inSelectedSite = assignments.find((a) => a.siteName === selectedSiteName);
      if (inSelectedSite) {
        meta[worker.id] = {
          assignedSiteName: selectedSiteName,
          alreadyAssignedInSelectedSite: true,
          hasOverlap: false,
          canAdd: false,
          message: `Already assigned to ${selectedSiteName}`,
        };
        continue;
      }

      const otherAssignments = assignments.filter((a) => a.siteName !== selectedSiteName);
      if (!otherAssignments.length) {
        meta[worker.id] = { hasOverlap: false, canAdd: true };
        continue;
      }

      const busyRanges = otherAssignments.map((a) => parseTimeRangeToMinutes(a.timeRange));
      const conflict = busyRanges.some((busy) => rangesOverlap(targetRange, busy));
      const firstSite = otherAssignments[0]?.siteName || 'another site';

      meta[worker.id] = {
        assignedSiteName: firstSite,
        hasOverlap: conflict,
        alreadyAssignedInSelectedSite: false,
        canAdd: !conflict,
        message: conflict
          ? `Already assigned to ${firstSite}. ${describeAvailabilityWindows(busyRanges)}`
          : `Already assigned to ${firstSite}, available for selected site at ${format12HourLabel(selectedRange.start)} - ${format12HourLabel(selectedRange.end)}`,
      };
    }

    return meta;
  }, [workerPool, workerAssignmentsByDate, selectedSiteName, timeRangeForAdd]);

  const selectedSite = useMemo(
    () => assignmentSites.find((s) => s.name === selectedSiteName) ?? assignmentSites[0],
    [assignmentSites, selectedSiteName]
  );
  const selectedSiteId = selectedSite?.id || '';

  const statCards = useMemo(() => {
    const activeSitesCount = assignmentSites.filter((s) => String(s.status).toLowerCase() === 'active').length;
    const pendingSitesCount = assignmentSites.filter((s) => String(s.status).toLowerCase() === 'pending').length;
    return [
      {
        label: 'Total Workers',
        value: String(workerPool.length),
        sub: 'Visible across all sites',
      },
      {
        label: 'Active Sites',
        value: String(activeSitesCount),
        sub: `${pendingSitesCount} more pending`,
      },
      {
        label: 'Assigned Today',
        value: String(assignedWorkers.length),
        sub: `${remainingWorkersPool.length} remaining workers`,
      },
    ];
  }, [workerPool.length, assignmentSites, assignedWorkers.length, remainingWorkersPool.length]);

  const draftCount = drafts.length;
  const publishedCount = drafts.filter((d) => d.published).length;
  const draftsForSelectedSiteAndDate = drafts.filter(
    (d) => d.siteName === selectedSiteName && d.date === allAssignmentsFilterDate
  );
  const draftItemsForSelectedSiteAndDate = draftsForSelectedSiteAndDate.filter((d) => !d.published);
  const publishedItemsForSelectedSiteAndDate = draftsForSelectedSiteAndDate.filter((d) => d.published);

  function mapApiAssignmentToDraft(row: any): DraftDay {
    return {
      id: row.id,
      date: formatYMD(new Date(row.assignmentDate)),
      siteName: row.siteName || selectedSiteName,
      timeRange: row.timeRange || timeRangeForAdd,
      assignedWorkers: Array.isArray(row.assignedWorkers)
        ? row.assignedWorkers.map((w: any) => ({
            id: String(w.workerId || w.id || ''),
            name: String(w.name || w.workerName || 'Worker'),
            role: String(w.role || w.workerRole || 'worker'),
            time: String(w.timeRange || timeRangeForAdd),
          }))
        : [],
      assignedCars: Array.isArray(row.assignedCars)
        ? row.assignedCars.map((c: any) => ({
            id: String(c.carId || c.id || ''),
            name: String(c.name || 'Car'),
            type: String(c.type || [c.model, c.number].filter(Boolean).join(' • ') || 'Car'),
            time: String(c.timeRange || timeRangeForAdd),
          }))
        : [],
      remainingLeave: [],
      published: row.status === 'published' || !!row.publishedAt,
      publishedAt: row.publishedAt || undefined,
    };
  }

  async function fetchAssignmentsForSite(siteIdParam?: string) {
    const siteId = siteIdParam || selectedSiteId;
    if (!siteId) {
      setDrafts([]);
      return;
    }
    const response = await fetch(`/api/assignments?siteId=${encodeURIComponent(siteId)}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch assignments');
    }
    const payload = await response.json();
    const items = Array.isArray(payload.assignments) ? payload.assignments : [];
    setDrafts(items.map(mapApiAssignmentToDraft));
  }

  async function fetchAssignedSiteCoverageByDate(dateParam: string) {
    const response = await fetch(`/api/assignments?date=${encodeURIComponent(dateParam)}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch assignment coverage');
    }
    const data = await response.json();
    const assignmentRows = Array.isArray(data?.assignments) ? data.assignments : [];
    const ids: string[] = Array.from(
      new Set(
        assignmentRows
          .map((row: any) => String(row?.siteId || '').trim())
          .filter((id: string) => id.length > 0)
      )
    );
    setAssignedSiteIdsForSelectedDate(ids);
    const workerAssignmentMap: Record<string, Array<{ siteName: string; timeRange: string }>> = {};
    for (const row of assignmentRows) {
      const siteName = String(row?.siteName || '').trim();
      const fallbackRange = String(row?.timeRange || '').trim();
      const workers = Array.isArray(row?.assignedWorkers) ? row.assignedWorkers : [];
      for (const w of workers) {
        const workerId = String(w?.workerId || w?.id || '').trim();
        if (!workerId) continue;
        const workerTimeRange = String(w?.timeRange || fallbackRange || '00:00 - 23:59').trim();
        if (!workerAssignmentMap[workerId]) workerAssignmentMap[workerId] = [];
        workerAssignmentMap[workerId].push({
          siteName: siteName || 'another site',
          timeRange: workerTimeRange,
        });
      }
    }
    setWorkerAssignmentsByDate(workerAssignmentMap);
  }

  function mapApiWorkersToAssignedWorkers(list: any[]): AssignedWorker[] {
    if (!Array.isArray(list)) return [];
    return list.map((w) => ({
      id: String(w.workerId || w.id || ''),
      name: String(w.name || w.workerName || 'Worker'),
      role: String(w.role || w.workerRole || 'worker'),
      time: String(w.timeRange || timeRangeForAdd),
    }));
  }

  function mapApiCarsToAssignedCars(list: any[]): AssignedCar[] {
    if (!Array.isArray(list)) return [];
    return list.map((c) => ({
      id: String(c.carId || c.id || ''),
      name: String(c.name || 'Car'),
      type: String(c.type || [c.model, c.number].filter(Boolean).join(' • ') || 'Car'),
      time: String(c.timeRange || timeRangeForAdd),
    }));
  }

  async function fetchSelectedAssignmentByDate(siteIdParam: string, dateParam: string) {
    if (!siteIdParam || !dateParam) return;
    setIsLoadingSelectedAssignment(true);
    setCurrentAssignmentId(null);
    setCurrentAssignmentStatus(null);
    try {
      const qs = new URLSearchParams({
        siteId: siteIdParam,
        date: dateParam,
      });
      const response = await fetch(`/api/assignments?${qs.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch assignment for selected date');
      const payload = await response.json();
      const list = Array.isArray(payload.assignments) ? payload.assignments : [];
      const row = list[0];
      if (!row) {
        setCurrentAssignmentId(null);
        setCurrentAssignmentStatus(null);
        setAssignedWorkers([]);
        setAssignedCars([]);
        return;
      }

      setCurrentAssignmentId(String(row.id));
      setCurrentAssignmentStatus(row.status === 'published' ? 'published' : 'draft');
      if (row.timeRange) setTimeRangeForAdd(String(row.timeRange));
      setAssignedWorkers(mapApiWorkersToAssignedWorkers(row.assignedWorkers || []));
      setAssignedCars(mapApiCarsToAssignedCars(row.assignedCars || []));
    } finally {
      setIsLoadingSelectedAssignment(false);
    }
  }

  async function ensureAssignmentForSelectedDate(): Promise<string> {
    if (!selectedSiteId) throw new Error('Please select a site first.');
    if (currentAssignmentId) return currentAssignmentId;

    const response = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        siteId: selectedSiteId,
        assignmentDate: selectedDate,
        timeRange: timeRangeForAdd,
        status: 'draft',
        assignedWorkers: [],
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create assignment for selected date');
    }
    const payload = await response.json();
    const created = Array.isArray(payload.assignments) ? payload.assignments[0] : null;
    const newId = created?.id ? String(created.id) : null;
    if (!newId) throw new Error('Assignment create response is invalid');

    setCurrentAssignmentId(newId);
    setCurrentAssignmentStatus(created.status === 'published' ? 'published' : 'draft');
    await fetchAssignmentsForSite(selectedSiteId);
    return newId;
  }

  function upsertWorkerAssignmentInLocalCoverage(workerId: string, siteName: string, timeRange: string) {
    setWorkerAssignmentsByDate((prev) => {
      const current = prev[workerId] || [];
      const next = current.filter((a) => a.siteName !== siteName);
      next.push({ siteName, timeRange });
      return {
        ...prev,
        [workerId]: next,
      };
    });
  }

  function removeWorkerAssignmentFromLocalCoverage(workerId: string, siteName: string) {
    setWorkerAssignmentsByDate((prev) => {
      const current = prev[workerId] || [];
      const next = current.filter((a) => a.siteName !== siteName);
      if (!next.length) {
        const { [workerId]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [workerId]: next,
      };
    });
  }

  async function addWorkerToCurrentAssignment(worker: WorkerBasic, customTimeRange?: string) {
    setWorkerAction({ workerId: worker.id, type: 'add' });
    try {
      const assignmentId = await ensureAssignmentForSelectedDate();
      const appliedTimeRange = customTimeRange || timeRangeForAdd;
      const response = await fetch(`/api/assignments/${assignmentId}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workerId: worker.id,
          time: appliedTimeRange,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to assign worker');
      }
      upsertWorkerAssignmentInLocalCoverage(worker.id, selectedSiteName, appliedTimeRange);
      if (selectedSiteId) {
        setAssignedSiteIdsForSelectedDate((prev) =>
          prev.includes(selectedSiteId) ? prev : [...prev, selectedSiteId]
        );
      }
      await Promise.all([
        fetchSelectedAssignmentByDate(selectedSiteId, selectedDate),
        fetchAssignmentsForSite(selectedSiteId),
        fetchAssignedSiteCoverageByDate(selectedDate),
      ]);
    } finally {
      setWorkerAction((prev) =>
        prev?.workerId === worker.id && prev.type === 'add' ? null : prev
      );
    }
  }

  function toggleWorkerSelectionForModal(workerId: string) {
    if (!workerAvailabilityMetaById[workerId]?.canAdd) return;
    setSelectedWorkerIdsForAdd((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
    );
  }

  async function addSelectedWorkersFromModal() {
    if (!selectedSiteId) {
      toast.error('Please select a site first.');
      return;
    }
    if (selectedWorkerIdsForAdd.length === 0) {
      toast.error('Please select at least one worker.');
      return;
    }

    const selectedWorkers = availableWorkersPool.filter(
      (w) => selectedWorkerIdsForAdd.includes(w.id) && !!workerAvailabilityMetaById[w.id]?.canAdd
    );
    if (selectedWorkers.length === 0) {
      toast.error('Selected workers are no longer available.');
      return;
    }

    setIsAddingWorkersFromModal(true);
    try {
      const assignmentId = await ensureAssignmentForSelectedDate();

      const results = await Promise.allSettled(
        selectedWorkers.map(async (worker) => {
          const appliedTimeRange = timeRangeForAdd;
          const response = await fetch(`/api/assignments/${assignmentId}/workers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              workerId: worker.id,
              time: appliedTimeRange,
            }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Failed to assign ${worker.name}`);
          }
        })
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failedCount = results.length - successCount;

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const worker = selectedWorkers[idx];
          if (worker) {
            upsertWorkerAssignmentInLocalCoverage(worker.id, selectedSiteName, timeRangeForAdd);
          }
        }
      });
      if (successCount > 0 && selectedSiteId) {
        setAssignedSiteIdsForSelectedDate((prev) =>
          prev.includes(selectedSiteId) ? prev : [...prev, selectedSiteId]
        );
      }

      await Promise.all([
        fetchSelectedAssignmentByDate(selectedSiteId, selectedDate),
        fetchAssignmentsForSite(selectedSiteId),
        fetchAssignedSiteCoverageByDate(selectedDate),
      ]);

      if (successCount > 0) {
        toast.success(
          `${successCount} worker${successCount > 1 ? 's' : ''} added to assignment.`
        );
      }
      if (failedCount > 0) {
        toast.error(
          `${failedCount} worker${failedCount > 1 ? 's' : ''} failed to add.`
        );
      }

      if (successCount > 0) {
        setAddWorkersOpen(false);
        setSelectedWorkerIdsForAdd([]);
        setAddWorkersQuery('');
      }
    } finally {
      setIsAddingWorkersFromModal(false);
    }
  }

  function openConflictResolutionModal(worker: WorkerBasic) {
    const selectedRange = parseTimeRangeValue(timeRangeForAdd);
    const suggestion = findSuggestedNonConflictingRange(worker.id);
    setConflictWorker(worker);
    setConflictStartTime(suggestion?.start || selectedRange.start);
    setConflictEndTime(suggestion?.end || selectedRange.end);
    setConflictError(null);
  }

  async function resolveConflictAndAddWorker() {
    if (!conflictWorker) return;

    if (toMinutes(conflictEndTime) <= toMinutes(conflictStartTime)) {
      setConflictError('End time must be after start time.');
      return;
    }

    if (hasTimeConflictWithOtherSites(conflictWorker.id, conflictStartTime, conflictEndTime)) {
      setConflictError('Selected time overlaps with another site assignment. Pick a non-overlapping range.');
      return;
    }

    setIsResolvingConflict(true);
    try {
      const customRange = buildTimeRange(conflictStartTime, conflictEndTime);
      await addWorkerToCurrentAssignment(conflictWorker, customRange);
      setConflictWorker(null);
      setConflictError(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign worker');
    } finally {
      setIsResolvingConflict(false);
    }
  }

  async function removeWorkerFromCurrentAssignment(workerId: string) {
    setWorkerAction({ workerId, type: 'remove' });
    if (!currentAssignmentId) {
      setAssignedWorkers((prev) => prev.filter((w) => w.id !== workerId));
      setWorkerAction(null);
      return;
    }
    try {
      const response = await fetch(`/api/assignments/${currentAssignmentId}/workers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workerId }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to remove worker');
      }
      removeWorkerAssignmentFromLocalCoverage(workerId, selectedSiteName);
      await Promise.all([
        fetchSelectedAssignmentByDate(selectedSiteId, selectedDate),
        fetchAssignmentsForSite(selectedSiteId),
        fetchAssignedSiteCoverageByDate(selectedDate),
      ]);
    } finally {
      setWorkerAction((prev) =>
        prev?.workerId === workerId && prev.type === 'remove' ? null : prev
      );
    }
  }

  async function updateWorkerTimeInCurrentAssignment(workerId: string, time: string) {
    if (!currentAssignmentId) return;
    setWorkerAction({ workerId, type: 'time' });
    try {
      const response = await fetch(`/api/assignments/${currentAssignmentId}/workers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workerId, time }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update worker time');
      }
      upsertWorkerAssignmentInLocalCoverage(workerId, selectedSiteName, time);
      await Promise.all([
        fetchSelectedAssignmentByDate(selectedSiteId, selectedDate),
        fetchAssignmentsForSite(selectedSiteId),
        fetchAssignedSiteCoverageByDate(selectedDate),
      ]);
    } finally {
      setWorkerAction((prev) =>
        prev?.workerId === workerId && prev.type === 'time' ? null : prev
      );
    }
  }

  async function addCarToCurrentAssignment(car: CarBasic) {
    setCarAction({ carId: car.id, type: 'add' });
    try {
      const assignmentId = await ensureAssignmentForSelectedDate();
      const response = await fetch(`/api/assignments/${assignmentId}/cars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          carId: car.id,
          time: timeRangeForAdd,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to assign car');
      }
      await fetchSelectedAssignmentByDate(selectedSiteId, selectedDate);
      await fetchAssignmentsForSite(selectedSiteId);
    } finally {
      setCarAction((prev) =>
        prev?.carId === car.id && prev.type === 'add' ? null : prev
      );
    }
  }

  async function removeCarFromCurrentAssignment(carId: string) {
    setCarAction({ carId, type: 'remove' });
    if (!currentAssignmentId) {
      setAssignedCars((prev) => prev.filter((c) => c.id !== carId));
      setCarAction(null);
      return;
    }
    try {
      const response = await fetch(`/api/assignments/${currentAssignmentId}/cars`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ carId }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to remove car');
      }
      await fetchSelectedAssignmentByDate(selectedSiteId, selectedDate);
      await fetchAssignmentsForSite(selectedSiteId);
    } finally {
      setCarAction((prev) =>
        prev?.carId === carId && prev.type === 'remove' ? null : prev
      );
    }
  }

  async function updateCarTimeInCurrentAssignment(carId: string, time: string) {
    if (!currentAssignmentId) return;
    setCarAction({ carId, type: 'time' });
    try {
      const response = await fetch(`/api/assignments/${currentAssignmentId}/cars`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ carId, time }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update car time');
      }
      await fetchSelectedAssignmentByDate(selectedSiteId, selectedDate);
      await fetchAssignmentsForSite(selectedSiteId);
    } finally {
      setCarAction((prev) =>
        prev?.carId === carId && prev.type === 'time' ? null : prev
      );
    }
  }

  async function upsertDraftsForDates(dates: string[], shouldPublish: boolean) {
    if (!selectedSiteId) {
      toast.error('Please select a site first.');
      return;
    }
    if (dates.length === 0) {
      toast.error('Please choose a valid date range.');
      return;
    }

    const effectiveStatus = shouldPublish
      ? 'published'
      : currentAssignmentStatus === 'published'
        ? 'published'
        : 'draft';

    const response = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        siteId: selectedSiteId,
        dates,
        timeRange: timeRangeForAdd,
        status: effectiveStatus,
        assignedWorkers: assignedWorkers.map((w) => ({
          id: w.id,
          time: w.time,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save assignments');
    }

    await fetchAssignmentsForSite(selectedSiteId);
    await fetchSelectedAssignmentByDate(selectedSiteId, selectedDate);
    toast.success(
      shouldPublish
        ? `Published for ${dates.length} day(s).`
        : currentAssignmentId
          ? `Updated for ${dates.length} day(s).`
          : `Saved for ${dates.length} day(s).`
    );
  }

  function createDayDraft() {
    upsertDraftsForDates([selectedDate], false).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save draft');
    });
  }

  function createRangeDraft() {
    upsertDraftsForDates(getDateRangeInclusive(rangeStart, rangeEnd), false).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save drafts');
    });
  }

  function publishDayForSelection() {
    upsertDraftsForDates([selectedDate], true).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to publish');
    });
  }

  function publishRangeForSelection() {
    upsertDraftsForDates(getDateRangeInclusive(rangeStart, rangeEnd), true).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to publish');
    });
  }

  async function setDraftStatus(id: string, shouldPublish: boolean) {
    const response = await fetch(`/api/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        status: shouldPublish ? 'published' : 'draft',
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update assignment status');
    }
    await fetchAssignmentsForSite(selectedSiteId);
    await fetchSelectedAssignmentByDate(selectedSiteId, selectedDate);
    setCurrentAssignmentStatus(shouldPublish ? 'published' : 'draft');
    toast.success(shouldPublish ? 'Draft published' : 'Moved back to draft');
  }

  function publishDraft(id: string) {
    setDraftStatus(id, true).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to publish draft');
    });
  }

  async function publishAllDrafts(draftIds: string[]) {
    if (!draftIds.length) {
      toast.error('No draft assignments to publish.');
      return;
    }
    setIsPublishingAllDrafts(true);
    try {
      const response = await fetch('/api/assignments/publish-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ids: draftIds,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to publish all drafts');
      }
      await Promise.all([
        fetchAssignmentsForSite(selectedSiteId),
        fetchSelectedAssignmentByDate(selectedSiteId, selectedDate),
        fetchAssignedSiteCoverageByDate(selectedDate),
      ]);
      toast.success('All draft assignments published');
    } finally {
      setIsPublishingAllDrafts(false);
    }
  }

  useEffect(() => {
    if (!selectedSiteId) return;
    Promise.all([
      fetchAssignmentsForSite(selectedSiteId),
      fetchSelectedAssignmentByDate(selectedSiteId, selectedDate),
    ]).catch(() => {
      toast.error('Failed to load assignments');
    });
  }, [selectedSiteId, selectedDate]);

  useEffect(() => {
    fetchAssignedSiteCoverageByDate(selectedDate).catch(() => {
      setAssignedSiteIdsForSelectedDate([]);
      setWorkerAssignmentsByDate({});
    });
  }, [selectedDate]);

  return (
    <AuthenticatedLayout>
      <div className="max-w-[1500px] mx-auto space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">Daily Workforce Planner</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Assign workers daily or for a date range. Use <b>Drafts</b> / <b>Publish</b> inside the Assignments panel.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {statCards.map((card) => (
            <Card key={card.label} className="p-2.5 sm:p-3 rounded-xl border">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="mt-0.5 font-semibold break-words text-gray-900 text-2xl sm:text-3xl leading-none">
                {card.value}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{card.sub}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
          <div className="w-full sm:w-auto">
            <p className="text-xs text-gray-500 mb-1">Assignment date</p>
            <Input
              type="date"
              min={TODAY_DATE}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 min-w-[200px] border-gray-200"
            />
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto h-10"
            onClick={() => {
              setAllAssignmentsFilterDate(selectedDate);
              setDraftsModalMode('draft');
              setDraftsOpen(true);
            }}
          >
            View all assignments
          </Button>
        </div>

        {/* Program view removed: use Draft/Publish modals instead */}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          <Card className="p-4 rounded-2xl xl:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Sites</h2>
              <Badge variant="outline">Instant filter</Badge>
            </div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search sites..."
                className="pl-9"
                value={sitesQuery}
                onChange={(e) => setSitesQuery(e.target.value)}
              />
            </div>
            <div className="mb-3 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={siteStatusFilter === 'all' ? 'default' : 'outline'}
                className={siteStatusFilter === 'all' ? 'bg-brand-gradient text-white hover:bg-brand-gradient' : ''}
                onClick={() => setSiteStatusFilter('all')}
              >
                All
              </Button>
              <Button
                type="button"
                size="sm"
                variant={siteStatusFilter === 'active' ? 'default' : 'outline'}
                className={siteStatusFilter === 'active' ? 'bg-brand-gradient text-white hover:bg-brand-gradient' : ''}
                onClick={() => setSiteStatusFilter('active')}
              >
                Active
              </Button>
              <Button
                type="button"
                size="sm"
                variant={siteStatusFilter === 'unassigned' ? 'default' : 'outline'}
                className={siteStatusFilter === 'unassigned' ? 'bg-brand-gradient text-white hover:bg-brand-gradient' : ''}
                onClick={() => setSiteStatusFilter('unassigned')}
              >
                Unassigned
              </Button>
            </div>
            <div className="space-y-3">
              {sitesLoading && assignmentSites.length === 0 ? (
                <p className="text-sm text-gray-500 rounded-xl border p-3 bg-gray-50">Loading sites...</p>
              ) : filteredSites.length === 0 ? (
                <p className="text-sm text-gray-500 rounded-xl border p-3 bg-gray-50">No sites found.</p>
              ) : (
                filteredSites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => {
                      setIsLoadingSelectedAssignment(true);
                      setSelectedSiteName(site.name);
                    }}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      site.name === selectedSiteName
                        ? 'bg-brand-gradient text-white border-transparent'
                        : 'bg-white text-gray-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-semibold ${site.name === selectedSiteName ? 'text-white' : 'text-gray-900'}`}>{site.name}</p>
                      {statusBadge(site.status)}
                    </div>
                    <p className={`text-sm mt-1 ${site.name === selectedSiteName ? 'text-white/80' : 'text-gray-500'}`}>{site.assigned} assigned</p>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl xl:col-span-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Assignments</h2>
                <p className="text-sm text-gray-500">
                  {selectedSiteName} • {selectedDate}
                </p>
                {currentAssignmentStatus && (
                  <p className="text-xs text-gray-500 mt-1">
                    Status: <span className="font-medium">{currentAssignmentStatus}</span>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (!selectedSiteId) {
                      toast.error('Please select a site first.');
                      return;
                    }
                    setSelectedWorkerIdsForAdd([]);
                    setAddWorkersQuery('');
                    setAddWorkersOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add worker
                </Button>

                <Button
                  size="sm"
                  className="w-full sm:w-auto bg-brand-gradient text-white hover:bg-brand-gradient"
                  onClick={() => {
                    if (assignTab === 'day') createDayDraft();
                    else createRangeDraft();
                  }}
                >
                  {currentAssignmentId ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
            <Tabs value={assignTab} onValueChange={(v) => setAssignTab(v as 'day' | 'range')}>
              {/* <TabsList className="w-full justify-start">
                <TabsTrigger value="day" className="sm:px-4">
                  Day
                </TabsTrigger>
                <TabsTrigger value="range" className="sm:px-4">
                  Multi-day
                </TabsTrigger>
              </TabsList> */}

              <TabsContent value="day" className="mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Time for new workers</p>
                    <TimeRangePicker value={timeRangeForAdd} onChange={setTimeRangeForAdd} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Use <b>{currentAssignmentId ? 'Update' : 'Save'}</b> to keep this assignment without changing status.
                </p>
              </TabsContent>

              <TabsContent value="range" className="mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Start date</p>
                    <Input
                      type="date"
                      min={TODAY_DATE}
                      value={rangeStart}
                      onChange={(e) => {
                        const next = e.target.value;
                        setRangeStart(next);
                        if (rangeEnd < next) setRangeEnd(next);
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">End date</p>
                    <Input
                      type="date"
                      min={rangeStart || TODAY_DATE}
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Time for new workers</p>
                    <TimeRangePicker value={timeRangeForAdd} onChange={setTimeRangeForAdd} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Preview: {getDateRangeInclusive(rangeStart, rangeEnd).length} day(s)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Use <b>{currentAssignmentId ? 'Update' : 'Save'}</b> to keep the whole range without changing status.
                </p>
              </TabsContent>
            </Tabs>

            <Tabs
              value={assignedView}
              onValueChange={(v) => setAssignedView(v as 'workers' | 'cars')}
            >
              <TabsList className="w-full justify-start">
                <TabsTrigger value="workers" className="sm:px-4">
                  Workers
                </TabsTrigger>
                <TabsTrigger value="cars" className="sm:px-4">
                  Cars
                </TabsTrigger>
              </TabsList>

              <TabsContent value="workers" className="mt-3">
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search assigned workers..."
                    className="pl-9"
                    value={assignedQuery}
                    onChange={(e) => setAssignedQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  {isLoadingSelectedAssignment && (
                    <div className="text-sm text-gray-500 rounded-xl border p-3 bg-gray-50 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading assignment workers...
                    </div>
                  )}
                  {filteredAssignedWorkers.map((worker) => (
                    <div key={worker.id} className="rounded-xl border p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{worker.name}</p>
                          <p className="text-sm text-gray-500">{worker.role}</p>
                        </div>
                        <div className="w-full sm:w-[260px]">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            Time
                            {workerAction?.workerId === worker.id && workerAction.type === 'time' && (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                          </p>
                          <TimeRangePicker
                            value={worker.time}
                            onChange={(next) => {
                              setAssignedWorkers((prev) =>
                                prev.map((w) =>
                                  w.id === worker.id ? { ...w, time: next } : w
                                )
                              );
                              updateWorkerTimeInCurrentAssignment(worker.id, next).catch((error) => {
                                toast.error(
                                  error instanceof Error ? error.message : 'Failed to update worker time'
                                );
                              });
                            }}
                            disabled={isLoadingSelectedAssignment}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2 text-red-600 hover:text-red-700"
                          onClick={() => {
                            removeWorkerFromCurrentAssignment(worker.id).catch((error) => {
                              toast.error(error instanceof Error ? error.message : 'Failed to remove worker');
                            });
                          }}
                          disabled={isLoadingSelectedAssignment}
                        >
                          {workerAction?.workerId === worker.id && workerAction.type === 'remove' && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="cars" className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Assigned Cars</h3>
                  <Badge variant="outline">{assignedCars.length} cars</Badge>
                </div>

                {assignedCars.length === 0 ? (
                  <p className="text-sm text-gray-500 rounded-xl border p-3 bg-gray-50">
                    No cars assigned yet. Add cars from the right panel.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignedCars.map((car) => (
                      <div key={car.id} className="rounded-xl border p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
                          <div>
                            <p className="font-semibold text-gray-900">{car.name}</p>
                            <p className="text-sm text-gray-500">{car.type}</p>
                          </div>
                        <div className="w-full sm:w-[260px]">
                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              Time
                              {carAction?.carId === car.id && carAction.type === 'time' && (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              )}
                            </p>
                            <TimeRangePicker
                              value={car.time}
                              onChange={(next) => {
                                setAssignedCars((prev) =>
                                  prev.map((c) =>
                                    c.id === car.id ? { ...c, time: next } : c
                                  )
                                );
                                updateCarTimeInCurrentAssignment(car.id, next).catch((error) => {
                                  toast.error(
                                    error instanceof Error ? error.message : 'Failed to update car time'
                                  );
                                });
                              }}
                              disabled={isLoadingSelectedAssignment}
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2 text-red-600 hover:text-red-700"
                            onClick={() => {
                              removeCarFromCurrentAssignment(car.id).catch((error) => {
                                toast.error(error instanceof Error ? error.message : 'Failed to remove car');
                              });
                            }}
                            disabled={isLoadingSelectedAssignment}
                          >
                            {carAction?.carId === car.id && carAction.type === 'remove' && (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            )}
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          <div className="xl:col-span-4 space-y-4">
            <Card className="p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Assignments Pool</h2>
                <Badge variant="outline">Instant filter</Badge>
              </div>

              <Tabs value={poolTab} onValueChange={(v) => setPoolTab(v as 'available' | 'remaining' | 'cars')}>
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="available" className="sm:px-4">
                    Available workers
                  </TabsTrigger>
                  <TabsTrigger value="remaining" className="sm:px-4">
                    Remaining workers
                  </TabsTrigger>
                  <TabsTrigger value="cars" className="sm:px-4">
                    Cars
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="available" className="mt-3">
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search available workers..."
                      className="pl-9"
                      value={availableQuery}
                      onChange={(e) => setAvailableQuery(e.target.value)}
                    />
                  </div>

                  {(workersLoading && workerPool.length === 0) || isLoadingSelectedAssignment ? (
                    <div className="text-sm text-gray-500 rounded-xl border p-3 bg-gray-50 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isLoadingSelectedAssignment ? 'Syncing available workers...' : 'Loading workers...'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                    {filteredAvailableWorkers.map((worker) => (
                      (() => {
                        const meta = workerAvailabilityMetaById[worker.id];
                        const canAdd = meta?.canAdd ?? true;
                        const hasConflict = meta?.hasOverlap ?? false;
                        const alreadyInSelectedSite = meta?.alreadyAssignedInSelectedSite ?? false;
                        return (
                      <div key={worker.id} className="rounded-xl border p-3 sm:p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{worker.name}</p>
                          <p className="text-sm text-gray-500">{worker.role}</p>
                          {meta?.message && (
                            <p className={`text-xs mt-1 ${hasConflict ? 'text-red-600' : 'text-amber-700'}`}>
                              {meta.message}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            if (hasConflict) {
                              openConflictResolutionModal(worker);
                              return;
                            }
                            addWorkerToCurrentAssignment(worker).catch((error) => {
                              toast.error(error instanceof Error ? error.message : 'Failed to assign worker');
                            });
                          }}
                          disabled={isLoadingSelectedAssignment || (!canAdd && !hasConflict)}
                        >
                          {workerAction?.workerId === worker.id && workerAction.type === 'add' && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          {hasConflict ? 'Resolve time' : !canAdd && alreadyInSelectedSite ? 'Added' : 'Add'}
                        </Button>
                      </div>
                        );
                      })()
                    ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="remaining" className="mt-3">
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search remaining workers..."
                      className="pl-9"
                      value={remainingQuery}
                      onChange={(e) => setRemainingQuery(e.target.value)}
                    />
                  </div>

                  {(workersLoading && workerPool.length === 0) || isLoadingSelectedAssignment ? (
                    <div className="text-sm text-gray-500 rounded-xl border p-3 bg-gray-50 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isLoadingSelectedAssignment ? 'Syncing remaining workers...' : 'Loading workers...'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                    {filteredRemainingWorkers.map((worker) => (
                      <div key={worker.id} className="rounded-xl border p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="font-medium text-gray-900">{worker.name}</p>
                            <p className="text-sm text-gray-500">{worker.role}</p>
                          </div>
                          <Badge variant="outline">Day off</Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <select
                              value={worker.status}
                              className="h-11 w-full rounded-md border border-input bg-background px-3 pr-9 text-sm appearance-none"
                              onChange={(e) => {
                                const next = e.target.value as LeaveStatus;
                                setLeaveStatusByWorker((prev) => ({ ...prev, [worker.id]: next }));
                              }}
                              disabled={isLoadingSelectedAssignment}
                            >
                              <option>Unpaid Day Off</option>
                              <option>Paid Day Off</option>
                              <option>No status</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              addWorkerToCurrentAssignment(worker).catch((error) => {
                                toast.error(error instanceof Error ? error.message : 'Failed to assign worker');
                              });
                            }}
                            disabled={isLoadingSelectedAssignment}
                          >
                            {workerAction?.workerId === worker.id && workerAction.type === 'add' && (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            )}
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="cars" className="mt-3">
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search cars..."
                      className="pl-9"
                      value={carQuery}
                      onChange={(e) => setCarQuery(e.target.value)}
                    />
                  </div>

                  {carsLoading && carPool.length === 0 ? (
                    <p className="text-sm text-gray-500 rounded-xl border p-3 bg-gray-50">
                      Loading cars...
                    </p>
                  ) : (
                    <div className="space-y-2">
                    {filteredCars.map((car) => (
                      <div key={car.id} className="rounded-xl border p-3 sm:p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{car.name}</p>
                          <p className="text-sm text-gray-500">{car.type}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            addCarToCurrentAssignment(car).catch((error) => {
                              toast.error(error instanceof Error ? error.message : 'Failed to assign car');
                            });
                          }}
                          disabled={isLoadingSelectedAssignment}
                        >
                          {carAction?.carId === car.id && carAction.type === 'add' && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          Add
                        </Button>
                      </div>
                    ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>

        <Dialog
          open={!!conflictWorker}
          onOpenChange={(open) => {
            if (!open) {
              setConflictWorker(null);
              setConflictError(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Resolve time conflict</DialogTitle>
            </DialogHeader>
            {conflictWorker && (
              <div className="space-y-3">
                <div className="rounded-xl border p-3 bg-gray-50">
                  <p className="text-sm font-medium text-gray-900">{conflictWorker.name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Already assigned on {selectedDate}:
                  </p>
                  <div className="mt-2 space-y-1">
                    {getOtherAssignmentsForWorker(conflictWorker.id).map((a, idx) => (
                      <p key={`${a.siteName}-${a.timeRange}-${idx}`} className="text-xs text-gray-700">
                        {a.siteName} ({formatTimeRange12h(a.timeRange)})
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Choose non-conflicting time for {selectedSiteName}</p>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <select
                      value={conflictStartTime}
                      onChange={(e) => {
                        setConflictStartTime(e.target.value);
                        setConflictError(null);
                      }}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {timeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-400 text-sm text-center">to</span>
                    <select
                      value={conflictEndTime}
                      onChange={(e) => {
                        setConflictEndTime(e.target.value);
                        setConflictError(null);
                      }}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {timeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {conflictError && (
                  <p className="text-xs text-red-600">{conflictError}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConflictWorker(null);
                      setConflictError(null);
                    }}
                    disabled={isResolvingConflict}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-brand-gradient text-white hover:bg-brand-gradient"
                    onClick={() => {
                      resolveConflictAndAddWorker().catch((error) => {
                        toast.error(error instanceof Error ? error.message : 'Failed to resolve conflict');
                      });
                    }}
                    disabled={isResolvingConflict}
                  >
                    {isResolvingConflict && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Add worker
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={addWorkersOpen} onOpenChange={setAddWorkersOpen}>
          <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add workers</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search workers..."
                  className="pl-9"
                  value={addWorkersQuery}
                  onChange={(e) => setAddWorkersQuery(e.target.value)}
                />
              </div>

              {workersLoading && workerPool.length === 0 ? (
                <div className="text-sm text-gray-500 rounded-xl border p-3 bg-gray-50 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading workers...
                </div>
              ) : modalWorkerOptions.length === 0 ? (
                <div className="text-sm text-gray-500 rounded-xl border p-3 bg-gray-50">
                  No available workers found.
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {modalWorkerOptions.map((worker) => (
                    (() => {
                      const meta = workerAvailabilityMetaById[worker.id];
                      const canAdd = meta?.canAdd ?? true;
                      const hasConflict = meta?.hasOverlap ?? false;
                      return (
                    <label
                      key={worker.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 ${
                        !canAdd ? 'opacity-70 cursor-not-allowed bg-gray-50' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedWorkerIdsForAdd.includes(worker.id)}
                        onChange={() => toggleWorkerSelectionForModal(worker.id)}
                        className="h-4 w-4"
                        disabled={isAddingWorkersFromModal || !canAdd}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{worker.name}</p>
                        <p className="text-sm text-gray-500 truncate">{worker.role}</p>
                        {meta?.message && (
                          <p className={`text-xs mt-1 ${hasConflict ? 'text-red-600' : 'text-amber-700'}`}>
                            {meta.message}
                          </p>
                        )}
                      </div>
                    </label>
                      );
                    })()
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-gray-500">
                  {selectedWorkerIdsForAdd.length} selected
                </p>
                <Button
                  size="sm"
                  className="bg-brand-gradient text-white hover:bg-brand-gradient"
                  onClick={() => {
                    addSelectedWorkersFromModal().catch((error) => {
                      toast.error(error instanceof Error ? error.message : 'Failed to add workers');
                    });
                  }}
                  disabled={isAddingWorkersFromModal || selectedWorkerIdsForAdd.length === 0}
                >
                  {isAddingWorkersFromModal && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add selected
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={draftsOpen} onOpenChange={setDraftsOpen}>
          <DialogContent className="sm:max-w-[1100px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View all assignments</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="date"
                    value={allAssignmentsFilterDate}
                    onChange={(e) => setAllAssignmentsFilterDate(e.target.value)}
                    className="pl-9 w-[170px]"
                  />
                </div>
                <Badge variant="outline">{selectedSiteName}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {draftItemsForSelectedSiteAndDate.length} draft / {publishedItemsForSelectedSiteAndDate.length} published
                </Badge>
                {draftsModalMode === 'draft' && (
                  <Button
                    size="sm"
                    className="bg-brand-gradient text-white hover:bg-brand-gradient"
                    disabled={isPublishingAllDrafts || draftItemsForSelectedSiteAndDate.length === 0}
                    onClick={() => {
                      publishAllDrafts(draftItemsForSelectedSiteAndDate.map((d) => d.id)).catch((error) => {
                        toast.error(error instanceof Error ? error.message : 'Failed to publish all drafts');
                      });
                    }}
                  >
                    {isPublishingAllDrafts && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Publish all
                  </Button>
                )}
              </div>
            </div>

            <Tabs
              value={draftsModalMode}
              onValueChange={(v) => setDraftsModalMode(v as 'draft' | 'published')}
            >
              <TabsList className="w-full justify-start mb-3">
                <TabsTrigger value="draft" className="sm:px-4">
                  Draft
                </TabsTrigger>
                <TabsTrigger value="published" className="sm:px-4">
                  Published
                </TabsTrigger>
              </TabsList>

              <TabsContent value="draft">
                {draftItemsForSelectedSiteAndDate.length === 0 ? (
                  <div className="rounded-xl border p-4 text-sm text-gray-500">
                    No draft assignments for this date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draftItemsForSelectedSiteAndDate
                      .slice()
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((d) => {
                        const paidCount = d.remainingLeave.filter((x) => x.status === 'Paid Day Off').length;
                        const unpaidCount = d.remainingLeave.filter((x) => x.status === 'Unpaid Day Off').length;
                        return (
                          <div key={d.id} className="rounded-xl border p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm text-gray-500">{d.siteName}</p>
                                <p className="text-lg font-semibold text-gray-900">{d.date}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {d.assignedWorkers.length} assigned workers • {d.assignedCars.length} cars • {d.timeRange}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Paid {paidCount} • Unpaid {unpaidCount}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Draft</Badge>
                                <Button
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() =>
                                    setDraftStatus(d.id, true).catch((error) => {
                                      toast.error(
                                        error instanceof Error ? error.message : 'Failed to publish draft'
                                      );
                                    })
                                  }
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Publish
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="published">
                {publishedItemsForSelectedSiteAndDate.length === 0 ? (
                  <div className="rounded-xl border p-4 text-sm text-gray-500">
                    No published assignments for this date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publishedItemsForSelectedSiteAndDate
                      .slice()
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((d) => {
                        const paidCount = d.remainingLeave.filter((x) => x.status === 'Paid Day Off').length;
                        const unpaidCount = d.remainingLeave.filter((x) => x.status === 'Unpaid Day Off').length;
                        return (
                          <div key={d.id} className="rounded-xl border p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm text-gray-500">{d.siteName}</p>
                                <p className="text-lg font-semibold text-gray-900">{d.date}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {d.assignedWorkers.length} assigned workers • {d.assignedCars.length} cars • {d.timeRange}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Paid {paidCount} • Unpaid {unpaidCount}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Published
                                </Badge>
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    setDraftStatus(d.id, false).catch((error) => {
                                      toast.error(
                                        error instanceof Error ? error.message : 'Failed to move draft status'
                                      );
                                    })
                                  }
                                >
                                  Set Draft
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
