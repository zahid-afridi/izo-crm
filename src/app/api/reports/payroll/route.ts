import { NextRequest, NextResponse } from 'next/server';
import { getPayrollReport } from '@/lib/reportService';

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month');

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: 'Invalid or missing month parameter. Expected format: YYYY-MM' },
      { status: 400 }
    );
  }

  const report = await getPayrollReport(month);
  return NextResponse.json(report);
}
