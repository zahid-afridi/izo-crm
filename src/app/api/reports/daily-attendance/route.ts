import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build date filter
    let dateFilter: any = {};
    if (dateFrom && dateTo) {
      dateFilter = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter = {
        gte: thirtyDaysAgo,
        lte: new Date(),
      };
    }

    // Get assignments grouped by date
    const assignments = await prisma.assignment.findMany({
      where: {
        assignedDate: dateFilter,
      },
      include: {
        worker: true,
        site: true,
      },
    });

    // Get attendance records for the same period
    const attendanceRecords = await prisma.siteAttendance.findMany({
      where: {
        date: dateFilter,
      },
    });

    // Group by date
    const dailyReportsMap = new Map();

    assignments.forEach(assignment => {
      const date = assignment.assignedDate.toISOString().split('T')[0];
      
      if (!dailyReportsMap.has(date)) {
        dailyReportsMap.set(date, {
          date,
          totalWorkers: new Set(),
          totalSites: new Set(),
          assignedWorkers: new Set(),
          attendedWorkers: new Set(),
        });
      }

      const report = dailyReportsMap.get(date);
      report.totalWorkers.add(assignment.workerId);
      report.totalSites.add(assignment.siteId);
      report.assignedWorkers.add(assignment.workerId);
    });

    // Add attendance data
    attendanceRecords.forEach(attendance => {
      const date = attendance.date.toISOString().split('T')[0];
      
      if (dailyReportsMap.has(date)) {
        const report = dailyReportsMap.get(date);
        report.attendedWorkers.add(attendance.workerId);
      }
    });

    // Convert to final format
    const reports = Array.from(dailyReportsMap.values()).map(report => {
      const assignedCount = report.assignedWorkers.size;
      const attendedCount = report.attendedWorkers.size;
      const attendanceRate = assignedCount > 0 ? Math.round((attendedCount / assignedCount) * 100) : 0;

      return {
        date: report.date,
        totalWorkers: report.totalWorkers.size,
        totalSites: report.totalSites.size,
        assignedWorkers: assignedCount,
        attendedWorkers: attendedCount,
        attendanceRate,
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      reports,
    });

  } catch (error: any) {
    console.error('Daily attendance report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily attendance report', details: error.message },
      { status: 500 }
    );
  }
}