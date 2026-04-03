import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Lock a car
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if car exists
    const existingCar = await prisma.car.findUnique({
      where: { id },
    });

    if (!existingCar) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }

    // Lock the car
    const car = await prisma.car.update({
      where: { id },
      data: { isLocked: true },
    });

    return NextResponse.json({
      message: 'Car locked successfully',
      car: {
        id: car.id,
        name: car.name,
        number: car.number,
        isLocked: car.isLocked
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error locking car:', error);
    return NextResponse.json(
      { error: 'Failed to lock car' },
      { status: 500 }
    );
  }
}

// DELETE - Unlock a car
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if car exists
    const existingCar = await prisma.car.findUnique({
      where: { id },
    });

    if (!existingCar) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }

    // Unlock the car
    const car = await prisma.car.update({
      where: { id },
      data: { isLocked: false },
    });

    return NextResponse.json({
      message: 'Car unlocked successfully',
      car: {
        id: car.id,
        name: car.name,
        number: car.number,
        isLocked: car.isLocked
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error unlocking car:', error);
    return NextResponse.json(
      { error: 'Failed to unlock car' },
      { status: 500 }
    );
  }
}