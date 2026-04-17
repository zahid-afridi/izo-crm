import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function formatHm(value?: Date | null) {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`;
}

function dateKeyUtc(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function todayKeyUtc() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function mapWorkerAssignment(row: {
  id: string;
  siteId: string;
  assignmentDate: Date;
  startTime: Date | null;
  endTime: Date | null;
  status: string;
  publishedAt: Date | null;
  site: { id: string; name: string; address: string; city: string | null; postalCode: string | null };
  workers: Array<{
    id: string;
    workerId: string;
    startTime: Date | null;
    endTime: Date | null;
    worker: {
      id: string;
      fullName: string | null;
      role: string | null;
      worker: { employeeType: string } | null;
    };
  }>;
  cars: Array<{
    id: string;
    carId: string;
    startTime: Date | null;
    endTime: Date | null;
    car: { id: string; name: string; model: string; number: string } | null;
  }>;
}, currentUserId: string) {
  const assignmentTimeRange =
    row.startTime && row.endTime ? `${formatHm(row.startTime)} - ${formatHm(row.endTime)}` : null;

  const myLink = row.workers.find((w) => w.workerId === currentUserId);
  const myTimeRange =
    myLink?.startTime && myLink?.endTime
      ? `${formatHm(myLink.startTime)} - ${formatHm(myLink.endTime)}`
      : assignmentTimeRange;

  const teammates = row.workers.map((w) => ({
    id: w.workerId,
    name: w.worker?.fullName || null,
    role: w.worker?.worker?.employeeType || w.worker?.role || 'worker',
    startTime: w.startTime,
    endTime: w.endTime,
    timeRange:
      w.startTime && w.endTime ? `${formatHm(w.startTime)} - ${formatHm(w.endTime)}` : null,
    isMe: w.workerId === currentUserId,
  }));

  return {
    id: row.id,
    siteId: row.siteId,
    siteName: row.site?.name || null,
    siteAddress: row.site?.address || null,
    siteCity: row.site?.city || null,
    sitePostalCode: row.site?.postalCode || null,
    assignmentDate: row.assignmentDate,
    startTime: row.startTime,
    endTime: row.endTime,
    timeRange: assignmentTimeRange,
    myTimeRange,
    status: row.status,
    publishedAt: row.publishedAt,
    teammates,
    assignedCars: row.cars.map((c) => ({
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
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role')?.toLowerCase() || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (userRole !== 'worker') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const links = await prisma.assignmentWorker.findMany({
      where: {
        workerId: userId,
        assignment: { status: 'published' },
      },
      include: {
        assignment: {
          include: {
            site: {
              select: { id: true, name: true, address: true, city: true, postalCode: true },
            },
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
                car: { select: { id: true, name: true, model: true, number: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const tKey = todayKeyUtc();
    const today: ReturnType<typeof mapWorkerAssignment>[] = [];
    const upcoming: ReturnType<typeof mapWorkerAssignment>[] = [];
    const history: ReturnType<typeof mapWorkerAssignment>[] = [];

    const seen = new Set<string>();
    for (const link of links) {
      const a = link.assignment;
      if (!a || seen.has(a.id)) continue;
      seen.add(a.id);

      const aKey = dateKeyUtc(new Date(a.assignmentDate));
      const dto = mapWorkerAssignment(a, userId);

      if (aKey === tKey) {
        today.push(dto);
      } else if (aKey > tKey) {
        upcoming.push(dto);
      } else if (aKey < tKey) {
        history.push(dto);
      }
    }

    upcoming.sort(
      (x, y) => new Date(x.assignmentDate).getTime() - new Date(y.assignmentDate).getTime()
    );
    history.sort(
      (x, y) => new Date(y.assignmentDate).getTime() - new Date(x.assignmentDate).getTime()
    );

    const teamRows = await prisma.team.findMany({
      where: {
        status: 'active',
        OR: [{ teamLeadId: userId }, { memberIds: { has: userId } }],
      },
      orderBy: { name: 'asc' },
    });

    const allMemberIds = new Set<string>();
    for (const t of teamRows) {
      allMemberIds.add(t.teamLeadId);
      for (const mid of t.memberIds) {
        if (mid) allMemberIds.add(mid);
      }
    }

    const users =
      allMemberIds.size > 0
        ? await prisma.users.findMany({
            where: { id: { in: [...allMemberIds] } },
            select: { id: true, fullName: true },
          })
        : [];
    const nameById = new Map(users.map((u) => [u.id, u.fullName || '']));

    const teams = teamRows.map((t) => {
      const combinedIds = [...new Set([t.teamLeadId, ...t.memberIds])];
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        teamLeadId: t.teamLeadId,
        teamLeadName: nameById.get(t.teamLeadId) || null,
        memberIds: t.memberIds,
        members: combinedIds.map((id) => ({
          id,
          name: nameById.get(id) || null,
          isMe: id === userId,
        })),
        iAmLead: t.teamLeadId === userId,
      };
    });

    return NextResponse.json({ today, upcoming, history, teams });
  } catch (e) {
    console.error('[GET /api/worker/assignments]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
