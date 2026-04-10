import type { PrismaClient } from '@prisma/client';
import type { AuthUser } from '@/lib/auth-middleware';
import { startOfDayFromYmd, endOfDayExclusive } from '@/lib/assignment-day';

export async function getAccessibleSiteIds(
  prisma: PrismaClient,
  user: AuthUser
): Promise<string[] | null> {
  if (user.role === 'admin') {
    const sites = await prisma.site.findMany({ select: { id: true } });
    return sites.map((s) => s.id);
  }
  if (user.role === 'site_manager') {
    const sites = await prisma.site.findMany({
      where: { siteManagerId: user.userId },
      select: { id: true },
    });
    return sites.map((s) => s.id);
  }
  return null;
}

export async function assertSiteAccess(
  prisma: PrismaClient,
  user: AuthUser,
  siteId: string
): Promise<boolean> {
  const ids = await getAccessibleSiteIds(prisma, user);
  if (ids === null) return false;
  return ids.includes(siteId);
}

export function dayBounds(ymd: string) {
  const start = startOfDayFromYmd(ymd);
  const end = endOfDayExclusive(start);
  return { start, end };
}

/** Workers on day D who have at least one locked active assignment. */
export async function workerIdsLockedOnDay(
  prisma: PrismaClient,
  dayStart: Date,
  dayEnd: Date
): Promise<Set<string>> {
  const rows = await prisma.assignment.findMany({
    where: {
      status: 'active',
      workerLocked: true,
      assignedDate: { gte: dayStart, lt: dayEnd },
    },
    select: { workerId: true },
  });
  return new Set(rows.map((r) => r.workerId));
}

/** Car IDs used on day D in a car-locked assignment. */
export async function carIdsLockedOnDay(
  prisma: PrismaClient,
  dayStart: Date,
  dayEnd: Date
): Promise<Set<string>> {
  const rows = await prisma.assignment.findMany({
    where: {
      status: 'active',
      carLocked: true,
      carId: { not: null },
      assignedDate: { gte: dayStart, lt: dayEnd },
    },
    select: { carId: true },
  });
  return new Set(rows.map((r) => r.carId!).filter(Boolean));
}
