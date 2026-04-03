import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build date filter
    let dateFilter: any = {};
    if (dateFrom && dateTo) {
      dateFilter = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      };
    }

    // Build site filter
    const siteFilter = siteId ? { siteId } : {};

    // Get assignments with worker and site data
    const assignments = await prisma.assignment.findMany({
      where: {
        ...siteFilter,
        ...(Object.keys(dateFilter).length > 0 && {
          assignedDate: dateFilter
        }),
      },
      include: {
        worker: true,
        site: true,
      },
    });

    // Group data by site
    const siteReportsMap = new Map();

    assignments.forEach(assignment => {
      const siteId = assignment.siteId;
      const siteName = assignment.site.name;
      
      if (!siteReportsMap.has(siteId)) {
        siteReportsMap.set(siteId, {
          siteId,
          siteName,
          totalWorkers: new Set(),
          totalWorkDays: 0,
          workDates: new Set(),
          workers: new Map(),
        });
      }

      const report = siteReportsMap.get(siteId);
      const workerId = assignment.workerId;
      const workerName = assignment.worker.fullName;
      const workDate = assignment.assignedDate.toISOString().split('T')[0];

      report.totalWorkers.add(workerId);
      report.workDates.add(workDate);

      if (!report.workers.has(workerId)) {
        report.workers.set(workerId, {
          workerId,
          workerName,
          workDays: new Set(),
        });
      }

      report.workers.get(workerId).workDays.add(workDate);
    });

    // Convert to final format
    const reports = Array.from(siteReportsMap.values()).map(report => ({
      siteId: report.siteId,
      siteName: report.siteName,
      totalWorkers: report.totalWorkers.size,
      totalWorkDays: Array.from(report.workDates).length,
      workDates: Array.from(report.workDates),
      workers: Array.from(report.workers.values()).map((worker: any) => ({
        workerId: worker.workerId,
        workerName: worker.workerName,
        workDays: worker.workDays.size,
      })),
    }));

    return NextResponse.json({
      success: true,
      reports,
    });

  } catch (error: any) {
    console.error('Site attendance report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate site attendance report', details: error.message },
      { status: 500 }
    );
  }
}