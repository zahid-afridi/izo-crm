'use client';


import { useMemo, useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Calendar,
  Search,
  Plus,
  ChevronDown,
  Send,
  CheckCircle2,
} from 'lucide-react';

export default function AssignmentsRoute() {
  const statCards = [
    { label: 'Total Workers', value: '100', sub: 'Visible across all sites' },
    { label: 'Active Sites', value: '20', sub: '10 more pending' },
    { label: 'Assigned Today', value: '81', sub: '19 remaining workers' },
  ];

  type WorkerBasic = { name: string; role: string };
  type AssignedWorker = WorkerBasic & { time: string };
  type LeaveStatus = 'Unpaid Day Off' | 'Paid Day Off' | 'No status';
  type RemainingWorker = WorkerBasic & { status: LeaveStatus };

  type CarBasic = { name: string; type: string };
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

  const DEFAULT_DATE = '2026-02-15';

  const sites = [
    { name: 'Site A - Lake View Residence', assigned: 12, status: 'Active' },
    { name: 'Site B - Commercial Building', assigned: 8, status: 'Active' },
    { name: 'Site C - Premium Villas', assigned: 0, status: 'Pending' },
    { name: 'Site D - Industrial Road', assigned: 5, status: 'Active' },
    { name: 'Site E - Green Terrace', assigned: 0, status: 'Closed' },
  ];

  const initialAssignedWorkers: AssignedWorker[] = [
    { name: 'Arjan M.', role: 'Mason', time: '08:00 - 16:00' },
    { name: 'Besnik L.', role: 'Electrician', time: '08:00 - 12:00' },
    { name: 'Dritan K.', role: 'Plumber', time: '13:00 - 17:00' },
    { name: 'Ervis T.', role: 'General Worker', time: '08:00 - 16:00' },
  ];

  const initialAssignedCars: AssignedCar[] = [];
  const initialAvailableCars: CarBasic[] = [
    { name: 'Car 1', type: 'Pickup Truck' },
    { name: 'Car 2', type: 'Van' },
    { name: 'Car 3', type: 'Sedan' },
    { name: 'Car 4', type: 'Pickup Truck' },
  ];

  const initialAvailableWorkers: WorkerBasic[] = [
    { name: 'Klevis H.', role: 'Carpenter' },
    { name: 'Lorenc S.', role: 'General Worker' },
    { name: 'Marin T.', role: 'Electrician' },
    { name: 'Dorian P.', role: 'Driver' },
    { name: 'Arben V.', role: 'Plumber' },
    { name: 'Genti Z.', role: 'General Worker' },
  ];

  const initialRemainingWorkers: RemainingWorker[] = [
    { name: 'Nertil B.', role: 'General Worker', status: 'Unpaid Day Off' },
    { name: 'Olsi D.', role: 'Driver', status: 'Unpaid Day Off' },
    { name: 'Petrit C.', role: 'Plumber', status: 'Paid Day Off' },
  ];

  const [selectedSiteName, setSelectedSiteName] = useState<string>(sites[0]?.name || '');
  const selectedSite = sites.find((s) => s.name === selectedSiteName) ?? sites[0];

  const [selectedDate, setSelectedDate] = useState<string>(DEFAULT_DATE);

  const [assignTab, setAssignTab] = useState<'day' | 'range'>('day');
  const [rangeStart, setRangeStart] = useState<string>(DEFAULT_DATE);
  const [rangeEnd, setRangeEnd] = useState<string>('2026-02-17');

  const [timeRangeForAdd, setTimeRangeForAdd] = useState<string>('08:00 - 16:00');

  const [assignedWorkers, setAssignedWorkers] = useState<AssignedWorker[]>(initialAssignedWorkers);
  const [availableWorkers, setAvailableWorkers] = useState<WorkerBasic[]>(initialAvailableWorkers);
  const [remainingWorkers, setRemainingWorkers] = useState<RemainingWorker[]>(initialRemainingWorkers);

  const [assignedCars, setAssignedCars] = useState<AssignedCar[]>(initialAssignedCars);
  const [availableCars, setAvailableCars] = useState<CarBasic[]>(initialAvailableCars);

  const [availableQuery, setAvailableQuery] = useState('');
  const [assignedQuery, setAssignedQuery] = useState('');
  const [remainingQuery, setRemainingQuery] = useState('');
  const [carQuery, setCarQuery] = useState('');

  const [poolTab, setPoolTab] = useState<'available' | 'remaining' | 'cars'>('available');
  const [assignedView, setAssignedView] = useState<'workers' | 'cars'>('workers');

  const [draftsOpen, setDraftsOpen] = useState(false);
  const [draftsModalMode, setDraftsModalMode] = useState<'draft' | 'published'>('draft');
  const [allAssignmentsFilterDate, setAllAssignmentsFilterDate] = useState<string>(DEFAULT_DATE);
  const [drafts, setDrafts] = useState<DraftDay[]>([]);

  const statusBadge = (status: string) => {
    if (status === 'Active') {
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{status}</Badge>;
    }
    if (status === 'Pending') {
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{status}</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">{status}</Badge>;
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

  const filteredAvailableWorkers = useMemo(() => {
    const q = availableQuery.trim().toLowerCase();
    if (!q) return availableWorkers;
    return availableWorkers.filter((w) => w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q));
  }, [availableWorkers, availableQuery]);

  const filteredAssignedWorkers = useMemo(() => {
    const q = assignedQuery.trim().toLowerCase();
    if (!q) return assignedWorkers;
    return assignedWorkers.filter((w) => w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q));
  }, [assignedWorkers, assignedQuery]);

  const filteredRemainingWorkers = useMemo(() => {
    const q = remainingQuery.trim().toLowerCase();
    if (!q) return remainingWorkers;
    return remainingWorkers.filter((w) => w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q));
  }, [remainingWorkers, remainingQuery]);

  const filteredCars = useMemo(() => {
    const q = carQuery.trim().toLowerCase();
    if (!q) return availableCars;
    return availableCars.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [availableCars, carQuery]);

  const draftCount = drafts.length;
  const publishedCount = drafts.filter((d) => d.published).length;
  const draftsForSelectedSiteAndDate = drafts.filter(
    (d) => d.siteName === selectedSiteName && d.date === allAssignmentsFilterDate
  );
  const draftItemsForSelectedSiteAndDate = draftsForSelectedSiteAndDate.filter((d) => !d.published);
  const publishedItemsForSelectedSiteAndDate = draftsForSelectedSiteAndDate.filter((d) => d.published);

  function upsertDraftsForDates(dates: string[], shouldPublish: boolean) {
    if (!selectedSiteName) return;
    if (dates.length === 0) {
      toast.error('Please choose a valid date range.');
      return;
    }

    const remainingLeave = remainingWorkers.map((w) => ({ name: w.name, status: w.status }));
    const assignedSnapshot = assignedWorkers;
    const assignedCarsSnapshot = assignedCars;

    const nextDrafts = [...drafts];
    let created = 0;
    let skipped = 0;
    const nowIso = new Date().toISOString();

    for (const date of dates) {
      const existingIndex = nextDrafts.findIndex((d) => d.date === date && d.siteName === selectedSiteName);

      const newDraft: DraftDay = {
        id:
          existingIndex >= 0
            ? nextDrafts[existingIndex].id
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        date,
        siteName: selectedSiteName,
        timeRange: timeRangeForAdd,
        assignedWorkers: assignedSnapshot,
        assignedCars: assignedCarsSnapshot,
        remainingLeave,
        published: shouldPublish ? true : false,
        publishedAt: shouldPublish ? nowIso : undefined,
      };

      // If user is saving drafts (not publishing) and the day is already published, keep it published.
      if (!shouldPublish && existingIndex >= 0 && nextDrafts[existingIndex].published) {
        skipped += 1;
        continue;
      }

      if (existingIndex >= 0) nextDrafts[existingIndex] = { ...nextDrafts[existingIndex], ...newDraft };
      else nextDrafts.unshift(newDraft);
      created += 1;
    }

    setDrafts(nextDrafts);
    toast.success(
      skipped > 0
        ? shouldPublish
          ? `Published for ${created} day(s). ${skipped} day(s) were already published.`
          : `Drafts saved for ${created} day(s). ${skipped} day(s) were already published.`
        : shouldPublish
          ? `Published for ${created} day(s).`
          : `Drafts saved for ${created} day(s).`
    );
  }

  function createDayDraft() {
    void upsertDraftsForDates([selectedDate], false);
  }

  function createRangeDraft() {
    void upsertDraftsForDates(getDateRangeInclusive(rangeStart, rangeEnd), false);
  }

  function publishDayForSelection() {
    void upsertDraftsForDates([selectedDate], true);
  }

  function publishRangeForSelection() {
    void upsertDraftsForDates(getDateRangeInclusive(rangeStart, rangeEnd), true);
  }

  function setDraftStatus(id: string, shouldPublish: boolean) {
    const nowIso = new Date().toISOString();
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              published: shouldPublish,
              publishedAt: shouldPublish ? nowIso : undefined,
            }
          : d
      )
    );
    toast.success(shouldPublish ? 'Draft published' : 'Moved back to draft');
    // TODO: Persist status change to DB via API.
  }

  function publishDraft(id: string) {
    setDraftStatus(id, true);
  }

  function publishAllDrafts() {
    setDrafts((prev) =>
      prev.map((d) =>
        d.published ? d : { ...d, published: true, publishedAt: new Date().toISOString() }
      )
    );
    toast.success('All drafts published');
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-[1500px] mx-auto space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Daily Workforce Planner</h1>
            <p className="text-sm text-gray-500">
              Assign workers daily or for a date range. Use <b>Drafts</b> / <b>Publish</b> inside the Assignments panel.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <div className="relative col-span-2 sm:col-span-1">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-9 w-full sm:w-[170px]"
              />
            </div>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setAssignTab('day');
                setSelectedDate(DEFAULT_DATE);
              }}
            >
              Today
            </Button>
            <Button
              className="w-full sm:w-auto bg-[#0d1b3f] hover:bg-[#0b1633]"
              onClick={() => {
                setAssignTab('day');
                setSelectedDate(addDays(DEFAULT_DATE, 1));
              }}
            >
              Tomorrow
            </Button>

            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setAllAssignmentsFilterDate(selectedDate);
                setDraftsModalMode('draft');
                setDraftsOpen(true);
              }}
            >
              View all assignments
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.label} className="p-4 sm:p-5 rounded-2xl border">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="mt-1 font-semibold break-words text-gray-900 text-4xl sm:text-5xl">
                {card.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{card.sub}</p>
            </Card>
          ))}
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
              <Input placeholder="Search sites..." className="pl-9" />
            </div>
            <div className="space-y-3">
              {sites.map((site) => (
                <button
                  key={site.name}
                  type="button"
                  onClick={() => setSelectedSiteName(site.name)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${site.name === selectedSiteName ? 'bg-[#0d1b3f] text-white border-[#0d1b3f]' : 'bg-white text-gray-900'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold ${site.name === selectedSiteName ? 'text-white' : 'text-gray-900'}`}>{site.name}</p>
                    {statusBadge(site.status)}
                  </div>
                  <p className={`text-sm mt-1 ${site.name === selectedSiteName ? 'text-white/80' : 'text-gray-500'}`}>{site.assigned} assigned</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl xl:col-span-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Assignments</h2>
                <p className="text-sm text-gray-500">
                  {selectedSiteName} • {selectedDate}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    toast('Use the pool on the right to add workers/cars.');
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add worker
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (assignTab === 'day') createDayDraft();
                    else createRangeDraft();
                  }}
                >
                  Drafts ({draftCount})
                </Button>

                <Button
                  size="sm"
                  className="w-full sm:w-auto bg-brand-gradient text-white hover:bg-brand-gradient"
                  onClick={() => {
                    if (assignTab === 'day') publishDayForSelection();
                    else publishRangeForSelection();
                  }}
                >
                  Publish
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Time for new workers</p>
                    <Input value={timeRangeForAdd} onChange={(e) => setTimeRangeForAdd(e.target.value)} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Date</p>
                    <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Use <b>Drafts</b> to save draft or <b>Publish</b> to publish this selection.
                </p>
              </TabsContent>

              <TabsContent value="range" className="mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Start date</p>
                    <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">End date</p>
                    <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Time for new workers</p>
                    <Input value={timeRangeForAdd} onChange={(e) => setTimeRangeForAdd(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Preview: {getDateRangeInclusive(rangeStart, rangeEnd).length} day(s)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Use <b>Drafts</b> to save drafts or <b>Publish</b> to publish the whole range.
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
                  {filteredAssignedWorkers.map((worker) => (
                    <div key={worker.name} className="rounded-xl border p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{worker.name}</p>
                          <p className="text-sm text-gray-500">{worker.role}</p>
                        </div>
                        <div className="w-full sm:w-[180px]">
                          <p className="text-xs text-gray-500 mb-1">Time</p>
                          <Input
                            value={worker.time}
                            onChange={(e) => {
                              const next = e.target.value;
                              setAssignedWorkers((prev) =>
                                prev.map((w) =>
                                  w.name === worker.name ? { ...w, time: next } : w
                                )
                              );
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2 text-red-600 hover:text-red-700"
                          onClick={() => {
                            setAssignedWorkers((prev) => prev.filter((w) => w.name !== worker.name));
                            setAvailableWorkers((prev) => {
                              if (prev.some((w) => w.name === worker.name)) return prev;
                              return [...prev, { name: worker.name, role: worker.role }];
                            });
                          }}
                        >
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
                      <div key={car.name} className="rounded-xl border p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
                          <div>
                            <p className="font-semibold text-gray-900">{car.name}</p>
                            <p className="text-sm text-gray-500">{car.type}</p>
                          </div>
                          <div className="w-full sm:w-[180px]">
                            <p className="text-xs text-gray-500 mb-1">Time</p>
                            <Input
                              value={car.time}
                              onChange={(e) => {
                                const next = e.target.value;
                                setAssignedCars((prev) =>
                                  prev.map((c) =>
                                    c.name === car.name ? { ...c, time: next } : c
                                  )
                                );
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2 text-red-600 hover:text-red-700"
                            onClick={() => {
                              setAssignedCars((prev) => prev.filter((c) => c.name !== car.name));
                              setAvailableCars((prev) => {
                                if (prev.some((x) => x.name === car.name)) return prev;
                                return [...prev, { name: car.name, type: car.type }];
                              });
                            }}
                          >
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

                  <div className="space-y-2">
                    {filteredAvailableWorkers.map((worker) => (
                      <div key={worker.name} className="rounded-xl border p-3 sm:p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{worker.name}</p>
                          <p className="text-sm text-gray-500">{worker.role}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setAvailableWorkers((prev) => prev.filter((w) => w.name !== worker.name));
                            setAssignedWorkers((prev) => {
                              if (prev.some((w) => w.name === worker.name)) return prev;
                              return [...prev, { ...worker, time: timeRangeForAdd }];
                            });
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
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

                  <div className="space-y-2">
                    {filteredRemainingWorkers.map((worker) => (
                      <div key={worker.name} className="rounded-xl border p-3 sm:p-4">
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
                              className="h-11 w-full rounded-md border border-input bg-background px-3 pr-9 text-sm"
                              onChange={(e) => {
                                const next = e.target.value as LeaveStatus;
                                setRemainingWorkers((prev) =>
                                  prev.map((w) => (w.name === worker.name ? { ...w, status: next } : w))
                                );
                              }}
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
                              setRemainingWorkers((prev) => prev.filter((w) => w.name !== worker.name));
                              setAssignedWorkers((prev) => {
                                if (prev.some((w) => w.name === worker.name)) return prev;
                                return [...prev, { name: worker.name, role: worker.role, time: timeRangeForAdd }];
                              });
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
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

                  <div className="space-y-2">
                    {filteredCars.map((car) => (
                      <div key={car.name} className="rounded-xl border p-3 sm:p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{car.name}</p>
                          <p className="text-sm text-gray-500">{car.type}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setAvailableCars((prev) => prev.filter((c) => c.name !== car.name));
                            setAssignedCars((prev) => {
                              if (prev.some((c) => c.name === car.name)) return prev;
                              return [...prev, { ...car, time: timeRangeForAdd }];
                            });
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>

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
              <Badge variant="outline">
                {draftItemsForSelectedSiteAndDate.length} draft / {publishedItemsForSelectedSiteAndDate.length} published
              </Badge>
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
                                  onClick={() => setDraftStatus(d.id, true)}
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
                                <Button variant="outline" onClick={() => setDraftStatus(d.id, false)}>
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
