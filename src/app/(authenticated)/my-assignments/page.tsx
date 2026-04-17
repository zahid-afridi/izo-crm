'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAuthRedux } from '@/hooks/useAuthRedux';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarDays,
  CalendarRange,
  Car,
  Clock,
  History,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';

type Teammate = {
  id: string;
  name: string | null;
  role: string;
  timeRange: string | null;
  isMe: boolean;
};

type AssignedCar = {
  id: string;
  carId: string;
  name: string | null;
  model: string | null;
  number: string | null;
  type: string;
  timeRange: string | null;
};

type WorkerAssignment = {
  id: string;
  siteId: string;
  siteName: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  sitePostalCode: string | null;
  assignmentDate: string;
  timeRange: string | null;
  myTimeRange: string | null;
  status: string;
  teammates: Teammate[];
  assignedCars: AssignedCar[];
};

type TeamRow = {
  id: string;
  name: string;
  description: string | null;
  teamLeadId: string;
  teamLeadName: string | null;
  memberIds: string[];
  members: { id: string; name: string | null; isMe: boolean }[];
  iAmLead: boolean;
};

function formatDateLabel(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function TabCount({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-200/90 px-1.5 text-[10px] font-bold text-slate-700 tabular-nums dark:bg-slate-700/90 dark:text-slate-100">
      {n > 99 ? '99+' : n}
    </span>
  );
}

export default function MyAssignmentsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthRedux();
  const [tab, setTab] = useState('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState<WorkerAssignment[]>([]);
  const [upcoming, setUpcoming] = useState<WorkerAssignment[]>([]);
  const [history, setHistory] = useState<WorkerAssignment[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [detail, setDetail] = useState<WorkerAssignment | null>(null);

  const role = user?.role?.toLowerCase() || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/worker/assignments', { cache: 'no-store' });
      if (res.status === 403 || res.status === 401) {
        setError(t('myAssignments.forbidden'));
        setToday([]);
        setUpcoming([]);
        setHistory([]);
        setTeams([]);
        return;
      }
      if (!res.ok) {
        setError(t('myAssignments.loadError'));
        return;
      }
      const data = await res.json();
      setToday(data.today || []);
      setUpcoming(data.upcoming || []);
      setHistory(data.history || []);
      setTeams(data.teams || []);
    } catch {
      setError(t('myAssignments.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    if (role !== 'worker') {
      router.replace('/dashboard');
      return;
    }
    void load();
  }, [isLoading, isAuthenticated, user, role, router, load]);

  const locale = i18n.language || 'en';

  const tabCounts = useMemo(
    () => ({
      today: today.length,
      upcoming: upcoming.length,
      teams: teams.length,
      history: history.length,
    }),
    [today.length, upcoming.length, teams.length, history.length]
  );

  const renderCard = (a: WorkerAssignment, variant: 'default' | 'history' = 'default') => (
    <div
      key={a.id}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-white/95 shadow-sm transition-all duration-200',
        'hover:shadow-md dark:bg-slate-900/95',
        variant === 'history'
          ? 'border-slate-200/90 dark:border-slate-700/80'
          : 'border-brand-200/40 dark:border-brand-900/40 hover:border-brand-300/60'
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-brand-gradient',
          variant === 'history' && 'opacity-40'
        )}
      />
      <div className="relative flex flex-col gap-4 p-5 pl-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-brand-700 dark:text-brand-300">
              {a.siteName || t('myAssignments.unknownSite')}
            </h3>
            {a.assignedCars.length > 0 ? (
              <Badge variant="outline" className="text-[10px] font-normal">
                {t('myAssignments.vehiclesShort', { count: a.assignedCars.length })}
              </Badge>
            ) : null}
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">
              <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {formatDateLabel(a.assignmentDate, locale)}
            </span>
            {(a.myTimeRange || a.timeRange) && (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-500">
                {a.myTimeRange || a.timeRange}
              </span>
            )}
          </p>
          {a.siteAddress ? (
            <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500/80" />
              <span>
                {a.siteAddress}
                {[a.siteCity, a.sitePostalCode].filter(Boolean).length
                  ? `, ${[a.siteCity, a.sitePostalCode].filter(Boolean).join(' ')}`
                  : ''}
              </span>
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-brand-200 bg-white hover:bg-brand-50 dark:border-brand-900 dark:bg-slate-900 dark:hover:bg-brand-950/40"
          onClick={() => setDetail(a)}
        >
          {t('myAssignments.view')}
        </Button>
      </div>
    </div>
  );

  const renderTeamCard = (team: TeamRow) => (
    <div
      key={team.id}
      className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-6 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/95"
    >
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-brand-100/50 blur-2xl dark:bg-brand-900/20" />
      <p className="relative text-lg font-semibold text-slate-900 dark:text-slate-100">{team.name}</p>
      {team.description ? (
        <p className="relative mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {team.description}
        </p>
      ) : null}
      <div className="relative mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t('myAssignments.teamLead')}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
            {team.teamLeadName || team.teamLeadId}
            {team.iAmLead ? (
              <span className="ml-2 text-xs font-normal text-brand-600">{t('myAssignments.youBadge')}</span>
            ) : null}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t('myAssignments.members')}
          </p>
          <ul className="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {team.members.map((m) => (
              <li key={m.id}>
                {m.name || m.id}
                {m.isMe ? (
                  <span className="ml-1.5 text-xs text-brand-600">({t('myAssignments.you')})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const listShell = (children: ReactNode) => (
    <div className="min-h-[320px] space-y-4 sm:min-h-[380px]">{children}</div>
  );

  if (!isLoading && isAuthenticated && user && role !== 'worker') {
    return null;
  }

  return (
    <AuthenticatedLayout>
      <div className="-mx-4 -mt-4 flex min-h-[calc(100dvh-5.5rem)] flex-col sm:-mx-6 sm:-mt-6">
        {/* Hero — full bleed */}
        <section className="relative overflow-hidden bg-brand-gradient px-4 pb-16 pt-10 text-white sm:px-8 sm:pb-20 sm:pt-12">
          <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-black/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-white/90">
              <Sparkles className="h-4 w-4" />
              {t('myAssignments.heroEyebrow')}
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.25rem] md:leading-tight">
              {t('myAssignments.title')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
              {t('myAssignments.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  {t('myAssignments.statToday')}
                </p>
                <p className="text-2xl font-bold tabular-nums">{today.length}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  {t('myAssignments.statUpcoming')}
                </p>
                <p className="text-2xl font-bold tabular-nums">{upcoming.length}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  {t('myAssignments.statTeams')}
                </p>
                <p className="text-2xl font-bold tabular-nums">{teams.length}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  {t('myAssignments.statHistory')}
                </p>
                <p className="text-2xl font-bold tabular-nums">{history.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main panel — overlaps hero */}
        <div className="relative z-10 -mt-10 flex-1 px-4 pb-10 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-0">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-lg backdrop-blur-md dark:border-slate-600/60 dark:bg-slate-900/95 md:grid-cols-4">
                <TabsTrigger
                  value="today"
                  className="flex h-auto min-h-[3.25rem] flex-col gap-1 rounded-xl py-3 data-[state=active]:border data-[state=active]:border-brand-200 data-[state=active]:bg-brand-50 data-[state=active]:shadow-sm dark:data-[state=active]:border-brand-900 dark:data-[state=active]:bg-brand-950/40"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    {t('myAssignments.tabToday')}
                    <TabCount n={tabCounts.today} />
                  </span>
                  <span className="hidden text-[10px] font-normal text-muted-foreground sm:block">
                    {t('myAssignments.tabTodayHint')}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="upcoming"
                  className="flex h-auto min-h-[3.25rem] flex-col gap-1 rounded-xl py-3 data-[state=active]:border data-[state=active]:border-brand-200 data-[state=active]:bg-brand-50 data-[state=active]:shadow-sm dark:data-[state=active]:border-brand-900 dark:data-[state=active]:bg-brand-950/40"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
                    <CalendarRange className="h-4 w-4 shrink-0" />
                    {t('myAssignments.tabUpcoming')}
                    <TabCount n={tabCounts.upcoming} />
                  </span>
                  <span className="hidden text-[10px] font-normal text-muted-foreground sm:block">
                    {t('myAssignments.tabUpcomingHint')}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="teams"
                  className="flex h-auto min-h-[3.25rem] flex-col gap-1 rounded-xl py-3 data-[state=active]:border data-[state=active]:border-brand-200 data-[state=active]:bg-brand-50 data-[state=active]:shadow-sm dark:data-[state=active]:border-brand-900 dark:data-[state=active]:bg-brand-950/40"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
                    <Users className="h-4 w-4 shrink-0" />
                    {t('myAssignments.tabTeams')}
                    <TabCount n={tabCounts.teams} />
                  </span>
                  <span className="hidden text-[10px] font-normal text-muted-foreground sm:block">
                    {t('myAssignments.tabTeamsHint')}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex h-auto min-h-[3.25rem] flex-col gap-1 rounded-xl py-3 data-[state=active]:border data-[state=active]:border-brand-200 data-[state=active]:bg-brand-50 data-[state=active]:shadow-sm dark:data-[state=active]:border-brand-900 dark:data-[state=active]:bg-brand-950/40"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
                    <History className="h-4 w-4 shrink-0" />
                    {t('myAssignments.tabHistory')}
                    <TabCount n={tabCounts.history} />
                  </span>
                  <span className="hidden text-[10px] font-normal text-muted-foreground sm:block">
                    {t('myAssignments.tabHistoryHint')}
                  </span>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-950/50 sm:p-6 md:p-8">
                {error ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                  </p>
                ) : null}

                {loading ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
                    <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    <p className="text-sm text-muted-foreground">{t('myAssignments.loading')}</p>
                  </div>
                ) : (
                  <>
                    <TabsContent value="today" className="m-0 mt-0 focus-visible:outline-none">
                      {listShell(
                        today.length === 0 ? (
                          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
                            <CalendarDays className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
                              {t('myAssignments.noToday')}
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-1">
                            {today.map((a) => renderCard(a))}
                          </div>
                        )
                      )}
                    </TabsContent>

                    <TabsContent value="upcoming" className="m-0 mt-0 focus-visible:outline-none">
                      {listShell(
                        upcoming.length === 0 ? (
                          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
                            <CalendarRange className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
                              {t('myAssignments.noUpcoming')}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">{upcoming.map((a) => renderCard(a))}</div>
                        )
                      )}
                    </TabsContent>

                    <TabsContent value="teams" className="m-0 mt-0 focus-visible:outline-none">
                      {listShell(
                        teams.length === 0 ? (
                          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
                            <Users className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
                              {t('myAssignments.emptyTeams')}
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">{teams.map(renderTeamCard)}</div>
                        )
                      )}
                    </TabsContent>

                    <TabsContent value="history" className="m-0 mt-0 focus-visible:outline-none">
                      {listShell(
                        history.length === 0 ? (
                          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
                            <History className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
                              {t('myAssignments.noHistory')}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">{history.map((a) => renderCard(a, 'history'))}</div>
                        )
                      )}
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-slate-200 sm:max-w-xl dark:border-slate-700">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 text-xl text-brand-700 dark:text-brand-300">
                  {detail.siteName || t('myAssignments.unknownSite')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 text-sm">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium dark:bg-slate-800">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDateLabel(detail.assignmentDate, locale)}
                  </span>
                  {(detail.myTimeRange || detail.timeRange) && (
                    <span className="inline-flex items-center rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 dark:bg-brand-950/50 dark:text-brand-200">
                      {detail.myTimeRange || detail.timeRange}
                    </span>
                  )}
                </div>
                {detail.siteAddress ? (
                  <div className="flex gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    <div className="text-slate-700 dark:text-slate-300">
                      <p>{detail.siteAddress}</p>
                      <p className="text-xs text-slate-500">
                        {[detail.siteCity, detail.sitePostalCode].filter(Boolean).join(' ')}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="mb-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                    <Users className="h-4 w-4 text-brand-600" />
                    {t('myAssignments.teamOnAssignment')}
                  </p>
                  <ul className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/50">
                    {detail.teammates.map((tm) => (
                      <li
                        key={tm.id}
                        className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-800"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {tm.name || tm.id}
                          {tm.isMe ? (
                            <span className="ml-2 text-xs font-normal text-brand-600">
                              ({t('myAssignments.you')})
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-slate-500">
                          {tm.role}
                          {tm.timeRange ? ` · ${tm.timeRange}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {detail.assignedCars.length > 0 ? (
                  <div>
                    <p className="mb-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                      <Car className="h-4 w-4 text-brand-600" />
                      {t('myAssignments.vehicles')}
                    </p>
                    <ul className="space-y-2 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/50">
                      {detail.assignedCars.map((c) => (
                        <li key={c.id} className="text-slate-700 dark:text-slate-300">
                          <span className="font-medium">{c.type}</span>
                          {c.timeRange ? (
                            <span className="ml-2 text-xs text-slate-500">{c.timeRange}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
