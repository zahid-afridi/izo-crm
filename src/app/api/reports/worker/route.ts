import { NextRequest, NextResponse } from 'next/server';
import { getWorkerReport } from '@/lib/reportService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const workerId = searchParams.get('workerId');
    const mode = searchParams.get('mode') as 'daily' | 'monthly' | null;
    const date = searchParams.get('date') ?? undefined;
    const month = searchParams.get('month') ?? undefined;

    if (!workerId) {
      return NextResponse.json({ error: 'workerId is required' }, { status: 400 });
    }

    if (!mode || (mode !== 'daily' && mode !== 'monthly')) {
      return NextResponse.json({ error: 'mode must be daily or monthly' }, { status: 400 });
    }

    if (mode === 'daily' && !date) {
      return NextResponse.json({ error: 'date is required for daily mode' }, { status: 400 });
    }

    if (mode === 'monthly' && !month) {
      return NextResponse.json({ error: 'month is required for monthly mode' }, { status: 400 });
    }

    const result = await getWorkerReport({ workerId, mode, date, month });
    return NextResponse.json(result);
  } catch (err: any) {
    if (err.message?.startsWith('Worker not found')) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
