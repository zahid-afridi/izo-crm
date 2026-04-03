import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get daily program for a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Use today's date if not provided
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const dailyProgram = await prisma.dailyProgram.findUnique({
      where: { date: targetDate },
    });

    if (!dailyProgram) {
      return NextResponse.json({
        date: targetDate,
        workersOnDayOff: [],
        allowWorkersToSeeFullProgram: false,
        isFinalized: false,
      });
    }

    return NextResponse.json(dailyProgram);
  } catch (error: any) {
    console.error('Error fetching daily program:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch daily program' },
      { status: 500 }
    );
  }
}

// POST - Create or update daily program
export async function POST(request: NextRequest) {
  try {
    const { date, workersOnDayOff, allowWorkersToSeeFullProgram, isFinalized } = await request.json();

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Check if daily program exists
    const existing = await prisma.dailyProgram.findUnique({
      where: { date: targetDate },
    });

    if (existing) {
      // Update existing
      const updated = await prisma.dailyProgram.update({
        where: { id: existing.id },
        data: {
          workersOnDayOff: workersOnDayOff || existing.workersOnDayOff,
          allowWorkersToSeeFullProgram: allowWorkersToSeeFullProgram ?? existing.allowWorkersToSeeFullProgram,
          isFinalized: isFinalized ?? existing.isFinalized,
          finalizedAt: isFinalized ? new Date() : existing.finalizedAt,
        },
      });

      return NextResponse.json(updated);
    } else {
      // Create new
      const created = await prisma.dailyProgram.create({
        data: {
          date: targetDate,
          workersOnDayOff: workersOnDayOff || [],
          allowWorkersToSeeFullProgram: allowWorkersToSeeFullProgram || false,
          isFinalized: isFinalized || false,
          finalizedAt: isFinalized ? new Date() : null,
        },
      });

      return NextResponse.json(created);
    }
  } catch (error: any) {
    console.error('Error creating/updating daily program:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create/update daily program' },
      { status: 500 }
    );
  }
}
