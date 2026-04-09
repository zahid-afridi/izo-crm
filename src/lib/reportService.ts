import { prisma } from '@/lib/prisma';
import { SiteReportResult, WorkerReportResult } from '@/types/assignments';

export async function getSiteReport(params: {
  siteId: string;
  mode: 'dateRange' | 'monthly' | 'total';
  dateFrom?: string;
  dateTo?: string;
  month?: string;
}): Promise<SiteReportResult> {
  const { siteId, mode, dateFrom, dateTo, month } = params;

  // Fetch site info
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, name: true, startDate: true, actualEndDate: true },
  });

  if (!site) {
    throw new Error(`Site not found: ${siteId}`);
  }

  // Determine date range
  let gte: Date;
  let lt: Date;

  if (mode === 'dateRange') {
    const [fy, fm, fd] = dateFrom!.split('-').map(Number);
    const [ty, tm, td] = dateTo!.split('-').map(Number);
    gte = new Date(Date.UTC(fy, fm - 1, fd));
    lt = new Date(Date.UTC(ty, tm - 1, td + 1));
  } else if (mode === 'monthly') {
    const [y, m] = month!.split('-').map(Number);
    gte = new Date(Date.UTC(y, m - 1, 1));
    lt = new Date(Date.UTC(y, m, 1));
  } else {
    // total: site.startDate to actualEndDate ?? today
    const start = site.startDate;
    gte = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const end = site.actualEndDate ?? new Date();
    lt = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1));
  }

  // Query assignments for the site in the date range
  const assignments = await prisma.assignment.findMany({
    where: {
      siteId,
      assignedDate: { gte, lt },
    },
    select: {
      assignedDate: true,
      worker: { select: { fullName: true } },
    },
    orderBy: { assignedDate: 'asc' },
  });

  // Group by date string YYYY-MM-DD
  const dateMap = new Map<string, string[]>();

  for (const a of assignments) {
    const d = a.assignedDate;
    const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, []);
    }
    dateMap.get(dateStr)!.push(a.worker.fullName);
  }

  // Build rows sorted by date
  const rows = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, workers]) => ({ date, workers, workerCount: workers.length }));

  const totalWorkerDays = rows.reduce((sum, r) => sum + r.workerCount, 0);

  return {
    site: { id: site.id, name: site.name },
    rows,
    summary: { totalWorkerDays },
  };
}

export async function getWorkerReport(params: {
  workerId: string;
  mode: 'daily' | 'monthly';
  date?: string;
  month?: string;
}): Promise<WorkerReportResult> {
  const { workerId, mode, date, month } = params;

  // Fetch the worker
  const worker = await prisma.users.findFirst({
    where: { id: workerId, role: 'worker' },
    select: { id: true, fullName: true },
  });

  if (!worker) {
    throw new Error(`Worker not found: ${workerId}`);
  }

  if (mode === 'daily') {
    if (!date) throw new Error('date is required for daily mode');

    const [y, m, d] = date.split('-').map(Number);
    const dayStart = new Date(Date.UTC(y, m - 1, d));
    const dayEnd = new Date(Date.UTC(y, m - 1, d + 1));

    // Check day-off
    const dailyProgram = await prisma.dailyProgram.findFirst({
      where: { date: dayStart },
      select: { workersOnDayOff: true },
    });

    if (dailyProgram?.workersOnDayOff.includes(workerId)) {
      return {
        worker,
        rows: [{ date, status: 'day_off' }],
      };
    }

    // Check active assignment
    const assignment = await prisma.assignment.findFirst({
      where: {
        workerId,
        assignedDate: { gte: dayStart, lt: dayEnd },
        status: 'active',
      },
      select: { site: { select: { name: true } } },
    });

    if (assignment) {
      return {
        worker,
        rows: [{ date, status: 'working', siteName: assignment.site.name }],
      };
    }

    return {
      worker,
      rows: [{ date, status: 'no_data' }],
    };
  }

  // monthly mode
  if (!month) throw new Error('month is required for monthly mode');

  const [y, m] = month.split('-').map(Number);
  const gte = new Date(Date.UTC(y, m - 1, 1));
  const lt = new Date(Date.UTC(y, m, 1));

  // Fetch all active assignments for the worker in the month
  const assignments = await prisma.assignment.findMany({
    where: {
      workerId,
      assignedDate: { gte, lt },
      status: 'active',
    },
    select: {
      assignedDate: true,
      site: { select: { name: true } },
    },
    orderBy: { assignedDate: 'asc' },
  });

  // Fetch DailyProgram records in the month
  const dailyPrograms = await prisma.dailyProgram.findMany({
    where: { date: { gte, lt } },
    select: { date: true, workersOnDayOff: true },
  });

  // Build a set of day-off dates for this worker
  const dayOffDates = new Set<string>();
  for (const dp of dailyPrograms) {
    if (dp.workersOnDayOff.includes(workerId)) {
      const d = dp.date;
      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      dayOffDates.add(dateStr);
    }
  }

  // Build per-date rows from assignments
  const rows: Array<{ date: string; status: string; siteName?: string }> = [];

  for (const a of assignments) {
    const d = a.assignedDate;
    const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    rows.push({ date: dateStr, status: 'working', siteName: a.site.name });
  }

  // Add day-off rows
  for (const dateStr of dayOffDates) {
    rows.push({ date: dateStr, status: 'day_off' });
  }

  // Sort rows by date
  rows.sort((a, b) => a.date.localeCompare(b.date));

  return {
    worker,
    workDays: assignments.length,
    dayOffDays: dayOffDates.size,
    rows,
  };
}

export async function getPayrollReport(month: string): Promise<import('@/types/assignments').PayrollReport> {
  const [y, m] = month.split('-').map(Number);
  const gte = new Date(Date.UTC(y, m - 1, 1));
  const lt = new Date(Date.UTC(y, m, 1));

  const workers = await prisma.worker.findMany({
    where: { removeStatus: 'active' },
    include: { user: { select: { id: true, fullName: true } } },
  });

  const rows = await Promise.all(
    workers.map(async (worker) => {
      const workDays = await prisma.assignment.count({
        where: {
          workerId: worker.userId,
          assignedDate: { gte, lt },
          status: 'active',
        },
      });

      const dailySalary = worker.hourlyRate
        ? Number(worker.hourlyRate) * 8
        : worker.monthlyRate
        ? Number(worker.monthlyRate) / 30
        : null;
      const totalEarnings = dailySalary !== null ? workDays * dailySalary : null;
      const paidAmount = 0;
      const dueAmount = totalEarnings;
      const missingSalaryWarning = dailySalary === null;

      return {
        workerId: worker.userId,
        fullName: worker.user.fullName,
        workDays,
        dailySalary,
        totalEarnings,
        paidAmount,
        dueAmount,
        missingSalaryWarning,
      };
    })
  );

  return { month, workers: rows };
}
