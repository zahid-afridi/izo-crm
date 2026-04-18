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
    <span className="flex h-4.5 min-w-[1.1rem] items-center justify-center rounded-full bg-white/20 px-1 text-[9px] font-bold tabular-nums">
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
        'group relative flex flex-col gap-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:bg-slate-900',
        variant === 'history'
          ? 'border-slate-200 dark:border-slate-700/70'
          : 'border-slate-200 hover:border-brand-300/50 dark:border-slate-700/70'
      )}
    >
      {/* Top accent bar */}
      <div
        className={cn(
          'h-1 w-full bg-brand-gradient',
          variant === 'history' && 'opacity-30'
        )}
      />

      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left content */}
        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Site name + vehicle badge */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {a.siteName || t('myAssignments.unknownSite')}
            </h3>
            {a.assignedCars.length > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-brand-200 bg-brand-50 text-[10px] font-medium text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/40 dark:text-brand-300"
              >
                <Car className="h-3 w-3" />
                {t('myAssignments.vehiclesShort', { count: a.assignedCars.length })}
              </Badge>
            )}
          </div>

          {/* Date + time row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {formatDateLabel(a.assignmentDate, locale)}
            </span>
            {(a.myTimeRange || a.timeRange) && (
              <span className="inline-flex items-center rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                {a.myTimeRange || a.timeRange}
              </span>
            )}
          </div>

          {/* Address */}
          {a.siteAddress && (
            <p className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500/70" />
              <span>
                {a.siteAddress}
                {[a.siteCity, a.sitePostalCode].filter(Boolean).length
                  ? `, ${[a.siteCity, a.sitePostalCode].filter(Boolean).join(' ')}`
                  : ''}
              </span>
            </p>
          )}
        </div>

        {/* View button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 self-start border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-800 dark:hover:bg-brand-950/40 sm:self-center"
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
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/70 dark:bg-slate-900"
    >
      {/* Top accent */}
      <div className="h-1 w-full bg-brand-gradient opacity-70" />

      <div className="p-5">
        {/* Decorative blob */}
        <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full bg-brand-100/40 blur-2xl dark:bg-brand-900/20" />

        <p className="relative text-base font-semibold text-slate-900 dark:text-slate-100">{team.name}</p>
        {team.description && (
          <p className="relative mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {team.description}
          </p>
        )}

        <div className="relative mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t('myAssignments.teamLead')}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
              {team.teamLeadName || team.teamLeadId}
              {team.iAmLead && (
                <span className="ml-2 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                  {t('myAssignments.youBadge')}
                </span>
              )}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t('myAssignments.members')}
            </p>
            <ul className="mt-1 space-y-1">
              {team.members.map((m) => (
                <li key={m.id} className="text-sm text-slate-700 dark:text-slate-300">
                  {m.name || m.id}
                  {m.isMe && (
                    <span className="ml-1.5 text-xs text-brand-600 dark:text-brand-400">
                      ({t('myAssignments.you')})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const EmptyState = ({
    icon: Icon,
    message,
  }: {
    icon: React.ElementType;
    message: string;
  }) => (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/30">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
        <Icon className="h-7 w-7 text-slate-300 dark:text-slate-600" />
      </div>
      <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );

  const listShell = (children: ReactNode) => (
    <div className="space-y-3">{children}</div>
  );

  if (!isLoading && isAuthenticated && user && role !== 'worker') {
    return null;
  }

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col gap-6 pb-10">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-2xl bg-brand-gradient px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 h-56 w-56 rounded-full bg-black/15 blur-3xl" />

          <div className="relative">
            {/* Eyebrow */}
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {t('myAssignments.heroEyebrow')}
            </div>

            {/* Title + subtitle */}
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t('myAssignments.title')}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              {t('myAssignments.subtitle')}
            </p>

            {/* Stats row */}
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { label: t('myAssignments.statToday'), value: today.length },
                { label: t('myAssignments.statUpcoming'), value: upcoming.length },
                { label: t('myAssignments.statTeams'), value: teams.length },
                { label: t('myAssignments.statHistory'), value: history.length },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="min-w-[5rem] rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">
                    {label}
                  </p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tabs + Content ── */}
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">

          {/* Tab bar */}
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900 md:grid-cols-4">
            {[
              { value: 'today', icon: CalendarDays, label: t('myAssignments.tabToday'), hint: t('myAssignments.tabTodayHint'), count: tabCounts.today },
              { value: 'upcoming', icon: CalendarRange, label: t('myAssignments.tabUpcoming'), hint: t('myAssignments.tabUpcomingHint'), count: tabCounts.upcoming },
              { value: 'teams', icon: Users, label: t('myAssignments.tabTeams'), hint: t('myAssignments.tabTeamsHint'), count: tabCounts.teams },
              { value: 'history', icon: History, label: t('myAssignments.tabHistory'), hint: t('myAssignments.tabHistoryHint'), count: tabCounts.history },
            ].map(({ value, icon: Icon, label, hint, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  'flex h-auto flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left transition-all',
                  'data-[state=active]:bg-brand-gradient data-[state=active]:text-white data-[state=active]:shadow-sm',
                  'data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:bg-slate-50 dark:data-[state=inactive]:hover:bg-slate-800/50'
                )}
              >
                <span className="flex w-full items-center gap-1.5 text-xs font-semibold sm:text-sm">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                  {count > 0 && (
                    <span className="ml-auto flex h-4.5 min-w-[1.1rem] items-center justify-center rounded-full bg-white/20 px-1 text-[9px] font-bold tabular-nums data-[state=inactive]:bg-slate-200 data-[state=inactive]:text-slate-600">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
                <span className="hidden truncate text-[10px] font-normal opacity-70 sm:block">
                  {hint}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Content panel */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-950/50 sm:p-6">

            {/* Error */}
            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                <p className="text-sm text-muted-foreground">{t('myAssignments.loading')}</p>
              </div>
            ) : (
              <>
                <TabsContent value="today" className="m-0 focus-visible:outline-none">
                  {listShell(
                    today.length === 0
                      ? <EmptyState icon={CalendarDays} message={t('myAssignments.noToday')} />
                      : <div className="space-y-3">{today.map((a) => renderCard(a))}</div>
                  )}
                </TabsContent>

                <TabsContent value="upcoming" className="m-0 focus-visible:outline-none">
                  {listShell(
                    upcoming.length === 0
                      ? <EmptyState icon={CalendarRange} message={t('myAssignments.noUpcoming')} />
                      : <div className="space-y-3">{upcoming.map((a) => renderCard(a))}</div>
                  )}
                </TabsContent>

                <TabsContent value="teams" className="m-0 focus-visible:outline-none">
                  {listShell(
                    teams.length === 0
                      ? <EmptyState icon={Users} message={t('myAssignments.emptyTeams')} />
                      : <div className="grid gap-4 md:grid-cols-2">{teams.map(renderTeamCard)}</div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="m-0 focus-visible:outline-none">
                  {listShell(
                    history.length === 0
                      ? <EmptyState icon={History} message={t('myAssignments.noHistory')} />
                      : <div className="space-y-3">{history.map((a) => renderCard(a, 'history'))}</div>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-slate-200 p-0 dark:border-slate-700 sm:max-w-xl">
          {detail && (
            <>
              {/* Dialog hero */}
              <div className="bg-brand-gradient px-6 pb-5 pt-6 text-white">
                <DialogHeader>
                  <DialogTitle className="pr-6 text-xl font-bold text-white">
                    {detail.siteName || t('myAssignments.unknownSite')}
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDateLabel(detail.assignmentDate, locale)}
                  </span>
                  {(detail.myTimeRange || detail.timeRange) && (
                    <span className="inline-flex items-center rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                      {detail.myTimeRange || detail.timeRange}
                    </span>
                  )}
                </div>
              </div>

              {/* Dialog body */}
              <div className="space-y-5 p-6 text-sm">
                {/* Address */}
                {detail.siteAddress && (
                  <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    <div className="text-slate-700 dark:text-slate-300">
                      <p className="font-medium">{detail.siteAddress}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[detail.siteCity, detail.sitePostalCode].filter(Boolean).join(' ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Team */}
                <div>
                  <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Users className="h-3.5 w-3.5 text-brand-500" />
                    {t('myAssignments.teamOnAssignment')}
                  </p>
                  <ul className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/50">
                    {detail.teammates.map((tm) => (
                      <li
                        key={tm.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {tm.name || tm.id}
                          {tm.isMe && (
                            <span className="ml-2 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                              {t('myAssignments.you')}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-slate-400">
                          {tm.role}
                          {tm.timeRange ? ` · ${tm.timeRange}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Vehicles */}
                {detail.assignedCars.length > 0 && (
                  <div>
                    <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Car className="h-3.5 w-3.5 text-brand-500" />
                      {t('myAssignments.vehicles')}
                    </p>
                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/50">
                      {detail.assignedCars.map((c) => (
                        <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{c.type}</span>
                          {c.timeRange && (
                            <span className="text-xs text-slate-400">{c.timeRange}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
