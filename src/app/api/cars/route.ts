import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'all') where.status = status;

    const cars = await prisma.car.findMany({
      where,
      select: {
        id: true,
        name: true,
        number: true,
        color: true,
        model: true,
        status: true,
        isLocked: true, // Include isLocked field for accurate counts
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ cars }, { status: 200 });
  } catch (error) {
    console.error('Error fetching cars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cars' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, number, color, model, status } = body;

    if (!name || !number || !color || !model) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if license plate already exists
    const existingCar = await prisma.car.findFirst({
      where: { number: number.toUpperCase() },
    });

    if (existingCar) {
      return NextResponse.json(
        { error: 'License plate already exists' },
        { status: 400 }
      );
    }

    const car = await prisma.car.create({
      data: {
        name,
        number: number.toUpperCase(),
        color,
        model,
        status: status || 'active',
      },
    });

    return NextResponse.json({ car }, { status: 201 });
  } catch (error) {
    console.error('Error creating car:', error);
    return NextResponse.json(
      { error: 'Failed to create car' },
      { status: 500 }
    );
  }
}
