import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, ids, dateFrom, dateTo } = body || {};

    const where: any = { status: 'draft' };
    if (siteId) where.siteId = siteId;
    if (Array.isArray(ids) && ids.length) where.id = { in: ids.map((id) => String(id)) };

    const from = normalizeDateOnly(dateFrom);
    const to = normalizeDateOnly(dateTo);
    if (from || to) {
      where.assignmentDate = {};
      if (from) where.assignmentDate.gte = from;
      if (to) where.assignmentDate.lte = to;
    }

    const result = await (prisma as any).assignment.updateMany({
      where,
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: 'Draft assignments published', updatedCount: result.count },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error publishing assignments:', error);
    return NextResponse.json({ error: 'Failed to publish assignments' }, { status: 500 });
  }
}

