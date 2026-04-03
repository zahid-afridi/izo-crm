import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const car = await prisma.car.findUnique({
      where: { id },
    });

    if (!car) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ car }, { status: 200 });
  } catch (error) {
    console.error('Error fetching car:', error);
    return NextResponse.json(
      { error: 'Failed to fetch car' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status value
    if (!status || !['active', 'inactive', 'maintenance'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be active, inactive, or maintenance' },
        { status: 400 }
      );
    }

    const car = await prisma.car.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ 
      car,
      message: 'Car status updated successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating car status:', error);
    return NextResponse.json(
      { error: 'Failed to update car status' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, number, color, model, status, isLocked } = body;

    // Check if this is just a lock/unlock operation
    const isLockOperation = isLocked !== undefined && !name && !number && !color && !model;

    // For full updates, require all fields
    if (!isLockOperation && (!name || !number || !color || !model)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, number, color, model are required for car updates' },
        { status: 400 }
      );
    }

    // Check if license plate already exists (only for full updates)
    if (!isLockOperation && number) {
      const existingCar = await prisma.car.findFirst({
        where: {
          number: number.toUpperCase(),
          NOT: { id },
        },
      });

      if (existingCar) {
        return NextResponse.json(
          { error: 'License plate already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};

    // For lock/unlock operations, only update isLocked
    if (isLockOperation) {
      updateData.isLocked = isLocked;
    } else {
      // For full updates, update all fields
      updateData.name = name;
      updateData.number = number.toUpperCase();
      updateData.color = color;
      updateData.model = model;
      updateData.status = status || 'active';
      
      if (isLocked !== undefined) {
        updateData.isLocked = isLocked;
      }
    }

    const car = await prisma.car.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ 
      car,
      message: isLockOperation ? 
        `Car ${isLocked ? 'locked' : 'unlocked'} successfully` : 
        'Car updated successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating car:', error);
    return NextResponse.json(
      { error: 'Failed to update car' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const car = await prisma.car.findUnique({
      where: { id },
    });

    if (!car) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }

    await prisma.car.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Car deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting car:', error);
    return NextResponse.json(
      { error: 'Failed to delete car' },
      { status: 500 }
    );
  }
}
