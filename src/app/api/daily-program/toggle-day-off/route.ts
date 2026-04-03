import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { workerId, date } = await request.json();

    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID is required' },
        { status: 400 }
      );
    }

    // Use today's date if not provided
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Find or create DailyProgram for the date
    let dailyProgram = await prisma.dailyProgram.findUnique({
      where: { date: targetDate },
    });

    if (!dailyProgram) {
      dailyProgram = await prisma.dailyProgram.create({
        data: {
          date: targetDate,
          workersOnDayOff: [workerId],
          allowWorkersToSeeFullProgram: false,
          isFinalized: false,
        },
      });

      return NextResponse.json({
        success: true,
        isOnDayOff: true,
        message: 'Worker marked as day off',
        dailyProgram,
      });
    }

    // Toggle worker in the array
    const workersOnDayOff = dailyProgram.workersOnDayOff || [];
    const isCurrentlyOff = workersOnDayOff.includes(workerId);

    const updatedWorkers = isCurrentlyOff
      ? workersOnDayOff.filter((id: string) => id !== workerId)
      : [...workersOnDayOff, workerId];

    const updatedProgram = await prisma.dailyProgram.update({
      where: { id: dailyProgram.id },
      data: {
        workersOnDayOff: updatedWorkers,
      },
    });

    return NextResponse.json({
      success: true,
      isOnDayOff: !isCurrentlyOff,
      message: isCurrentlyOff
        ? 'Worker is now available'
        : 'Worker marked as day off',
      dailyProgram: updatedProgram,
    });
  } catch (error: any) {
    console.error('Error toggling day off:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle day off' },
      { status: 500 }
    );
  }
}
