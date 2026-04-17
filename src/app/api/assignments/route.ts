import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type WorkerInput = {
  workerId: string;
  startTime?: string;
  endTime?: string;
  time?: string;
};

function normalizeDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0)
  );
}

function parseTimeOnDate(date: Date, value?: string | null): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const hm = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (hm) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), Number(hm[1]), Number(hm[2]), 0, 0)
    );
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseRangeOnDate(date: Date, value?: string | null) {
  if (!value) return { start: null as Date | null, end: null as Date | null };
  const [left, right] = String(value)
    .split('-')
    .map((x) => x.trim());
  return {
    start: parseTimeOnDate(date, left),
    end: parseTimeOnDate(date, right),
  };
}

function formatHm(value?: Date | null) {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`;
}

function assignmentDto(row: any) {
  return {
    id: row.id,
    siteId: row.siteId,
    siteName: row.site?.name || null,
    assignmentDate: row.assignmentDate,
    startTime: row.startTime,
    endTime: row.endTime,
    timeRange:
      row.startTime && row.endTime ? `${formatHm(row.startTime)} - ${formatHm(row.endTime)}` : null,
    status: row.status,
    publishedAt: row.publishedAt,
    assignedWorkers:
      row.workers?.map((w: any) => ({
        id: w.id,
        workerId: w.workerId,
        name: w.worker?.fullName || null,
        role: w.worker?.worker?.employeeType || w.worker?.role || 'worker',
        startTime: w.startTime,
        endTime: w.endTime,
        timeRange:
          w.startTime && w.endTime ? `${formatHm(w.startTime)} - ${formatHm(w.endTime)}` : null,
      })) || [],
    assignedCars:
      row.cars?.map((c: any) => ({
        id: c.id,
        carId: c.carId,
        name: c.car?.name || null,
        model: c.car?.model || null,
        number: c.car?.number || null,
        type: [c.car?.model, c.car?.number].filter(Boolean).join(' • ') || 'Car',
        startTime: c.startTime,
        endTime: c.endTime,
        timeRange:
          c.startTime && c.endTime ? `${formatHm(c.startTime)} - ${formatHm(c.endTime)}` : null,
      })) || [],
    remainingLeave: [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function dateRangeInclusive(start: Date, end: Date) {
  const out: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const status = searchParams.get('status');
    const date = normalizeDateOnly(searchParams.get('date'));
    const dateFrom = normalizeDateOnly(searchParams.get('dateFrom'));
    const dateTo = normalizeDateOnly(searchParams.get('dateTo'));

    const where: any = {};
    if (siteId) where.siteId = siteId;
    if (status && status !== 'all') where.status = status;
    if (date) where.assignmentDate = date;
    else if (dateFrom || dateTo) {
      where.assignmentDate = {};
      if (dateFrom) where.assignmentDate.gte = dateFrom;
      if (dateTo) where.assignmentDate.lte = dateTo;
    }

    const rows = await (prisma as any).assignment.findMany({
      where,
      include: {
        site: { select: { id: true, name: true } },
        workers: {
          include: {
            worker: {
              select: {
                id: true,
                fullName: true,
                role: true,
                worker: { select: { employeeType: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        cars: {
          include: {
            car: {
              select: {
                id: true,
                name: true,
                model: true,
                number: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ assignmentDate: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ assignments: rows.map(assignmentDto) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      siteId,
      siteName,
      assignmentDate,
      dates,
      startDate,
      endDate,
      startTime,
      endTime,
      timeRange,
      status = 'draft',
      assignedWorkers = [],
      overwriteWorkers = true,
    } = body || {};

    let resolvedSiteId: string | null = siteId ? String(siteId) : null;
    if (!resolvedSiteId && siteName) {
      const siteByName = await prisma.site.findFirst({
        where: { name: String(siteName) },
        select: { id: true },
      });
      resolvedSiteId = siteByName?.id || null;
    }

    if (!resolvedSiteId) {
      return NextResponse.json({ error: 'siteId or siteName is required' }, { status: 400 });
    }

    const site = await prisma.site.findUnique({ where: { id: resolvedSiteId }, select: { id: true } });
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    let targetDates: Date[] = [];
    if (Array.isArray(dates) && dates.length) {
      targetDates = dates.map((d) => normalizeDateOnly(d)).filter((d): d is Date => !!d);
    } else if (startDate && endDate) {
      const from = normalizeDateOnly(startDate);
      const to = normalizeDateOnly(endDate);
      if (!from || !to || from > to) {
        return NextResponse.json({ error: 'Invalid startDate/endDate range' }, { status: 400 });
      }
      targetDates = dateRangeInclusive(from, to);
    } else {
      const one = normalizeDateOnly(assignmentDate);
      if (!one) return NextResponse.json({ error: 'assignmentDate is required' }, { status: 400 });
      targetDates = [one];
    }

    const workerInputs: WorkerInput[] = Array.isArray(assignedWorkers)
      ? assignedWorkers
          .filter((w: any) => w?.workerId || w?.id)
          .map((w: any) => ({
            workerId: String(w.workerId || w.id),
            startTime: w.startTime,
            endTime: w.endTime,
            time: w.time,
          }))
      : [];

    const workerIds = [...new Set(workerInputs.map((w) => w.workerId))];
    const validWorkerRows = workerIds.length
      ? await prisma.users.findMany({
          where: { id: { in: workerIds }, role: 'worker' },
          select: { id: true },
        })
      : [];
    const validWorkerIds = new Set(validWorkerRows.map((w) => w.id));

    const output: any[] = [];

    for (const dt of targetDates) {
      const range = parseRangeOnDate(dt, timeRange);
      const assignmentStart = parseTimeOnDate(dt, startTime) ?? range.start;
      const assignmentEnd = parseTimeOnDate(dt, endTime) ?? range.end;

      const row = await (prisma as any).assignment.upsert({
        where: {
          siteId_assignmentDate: {
            siteId: resolvedSiteId,
            assignmentDate: dt,
          },
        },
        create: {
          siteId: resolvedSiteId,
          assignmentDate: dt,
          startTime: assignmentStart,
          endTime: assignmentEnd,
          status,
          publishedAt: status === 'published' ? new Date() : null,
        },
        update: {
          startTime: assignmentStart,
          endTime: assignmentEnd,
          status,
          publishedAt: status === 'published' ? new Date() : null,
        },
      });

      if (overwriteWorkers) {
        await (prisma as any).assignmentWorker.deleteMany({ where: { assignmentId: row.id } });
      }

      for (const worker of workerInputs) {
        if (!validWorkerIds.has(worker.workerId)) continue;
        const workerRange = parseRangeOnDate(dt, worker.time);
        const workerStart = parseTimeOnDate(dt, worker.startTime) ?? workerRange.start ?? assignmentStart;
        const workerEnd = parseTimeOnDate(dt, worker.endTime) ?? workerRange.end ?? assignmentEnd;

        if (overwriteWorkers) {
          await (prisma as any).assignmentWorker.create({
            data: {
              assignmentId: row.id,
              workerId: worker.workerId,
              startTime: workerStart,
              endTime: workerEnd,
            },
          });
        } else {
          await (prisma as any).assignmentWorker.upsert({
            where: {
              assignmentId_workerId: {
                assignmentId: row.id,
                workerId: worker.workerId,
              },
            },
            create: {
              assignmentId: row.id,
              workerId: worker.workerId,
              startTime: workerStart,
              endTime: workerEnd,
            },
            update: {
              startTime: workerStart,
              endTime: workerEnd,
            },
          });
        }
      }

      const full = await (prisma as any).assignment.findUnique({
        where: { id: row.id },
        include: {
          site: { select: { id: true, name: true } },
          workers: {
            include: {
              worker: {
                select: {
                  id: true,
                  fullName: true,
                  role: true,
                  worker: { select: { employeeType: true } },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          cars: {
            include: {
              car: {
                select: {
                  id: true,
                  name: true,
                  model: true,
                  number: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      output.push(assignmentDto(full));
    }

    return NextResponse.json({ message: 'Assignments saved', assignments: output }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving assignments:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Assignment already exists for site/date' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to save assignments' }, { status: 500 });
  }
}

