import { NextRequest, NextResponse } from 'next/server';
import { getSiteReport } from '@/lib/reportService';

/**
 * GET /api/reports/site
 * Query params: siteId, mode (dateRange|monthly|total), dateFrom, dateTo, month
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const siteId = searchParams.get('siteId');
  const mode = searchParams.get('mode') as 'dateRange' | 'monthly' | 'total' | null;

  // Validate required params
  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  if (!mode || !['dateRange', 'monthly', 'total'].includes(mode)) {
    return NextResponse.json(
      { error: 'mode is required and must be one of: dateRange, monthly, total' },
      { status: 400 }
    );
  }

  // Validate mode-specific params
  if (mode === 'dateRange') {
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'dateFrom and dateTo are required for dateRange mode' },
        { status: 400 }
      );
    }
  }

  if (mode === 'monthly') {
    const month = searchParams.get('month');
    if (!month) {
      return NextResponse.json(
        { error: 'month is required for monthly mode (format: YYYY-MM)' },
        { status: 400 }
      );
    }
  }

  try {
    const result = await getSiteReport({
      siteId,
      mode,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
      month: searchParams.get('month') ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message?.startsWith('Site not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('Error generating site report:', error);
    return NextResponse.json({ error: 'Failed to generate site report' }, { status: 500 });
  }
}
