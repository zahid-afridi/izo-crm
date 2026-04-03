import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, workersOnDayOff, allowWorkersToSeeFullProgram } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Create or update daily program record
    const dailyProgram = await prisma.dailyProgram.upsert({
      where: { date: new Date(date) },
      update: {
        workersOnDayOff: workersOnDayOff || [],
        allowWorkersToSeeFullProgram: allowWorkersToSeeFullProgram || false,
        isFinalized: true,
        finalizedAt: new Date(),
      },
      create: {
        date: new Date(date),
        workersOnDayOff: workersOnDayOff || [],
        allowWorkersToSeeFullProgram: allowWorkersToSeeFullProgram || false,
        isFinalized: true,
        finalizedAt: new Date(),
      },
    });

    // Log activity
    const userId = request.headers.get('x-user-id');
    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'finalize',
          module: 'Daily Program',
          description: `Finalized daily program for ${date}`,
          entityType: 'DailyProgram',
          entityId: dailyProgram.id,
          newValues: {
            date,
            workersOnDayOff: workersOnDayOff?.length || 0,
            allowWorkersToSeeFullProgram,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      dailyProgram,
    });

  } catch (error: any) {
    console.error('Finalize daily program error:', error);
    return NextResponse.json(
      { error: 'Failed to finalize daily program', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const dailyProgram = await prisma.dailyProgram.findUnique({
      where: { date: new Date(date) },
    });

    return NextResponse.json({
      success: true,
      dailyProgram,
    });

  } catch (error: any) {
    console.error('Get daily program error:', error);
    return NextResponse.json(
      { error: 'Failed to get daily program', details: error.message },
      { status: 500 }
    );
  }
}