import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single service package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const servicePackage = await prisma.servicePackage.findUnique({
      where: { id },
    });

    if (!servicePackage) {
      return NextResponse.json(
        { error: 'Service package not found' },
        { status: 404 }
      );
    }

    // Enrich with product and service details
    const serviceIds = (servicePackage.services as any[]).map((s) => s.id);
    const productIds = (servicePackage.products as any[]).map((p) => p.id);

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const enrichedServices = (servicePackage.services as any[]).map((s) => ({
      ...s,
      details: services.find((srv) => srv.id === s.id),
    }));

    const enrichedProducts = (servicePackage.products as any[]).map((p) => ({
      ...p,
      details: products.find((prod) => prod.id === p.id),
    }));

    const enrichedPackage = {
      ...servicePackage,
      services: enrichedServices,
      products: enrichedProducts,
    };

    return NextResponse.json({ package: enrichedPackage }, { status: 200 });
  } catch (error) {
    console.error('Error fetching service package:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service package' },
      { status: 500 }
    );
  }
}

// PUT update service package
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingPackage = await prisma.servicePackage.findUnique({
      where: { id },
    });

    if (!existingPackage) {
      return NextResponse.json(
        { error: 'Service package not found' },
        { status: 404 }
      );
    }

    const { name, description, unit, price, status, services, products } = body;

    const updateData: any = {};

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (unit) updateData.unit = unit;
    if (price) updateData.price = parseFloat(price);
    if (status) updateData.status = status;
    if (services !== undefined) updateData.services = services;
    if (products !== undefined) updateData.products = products;

    const servicePackage = await prisma.servicePackage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(
      { message: 'Service package updated successfully', package: servicePackage },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating service package:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Service package not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update service package' },
      { status: 500 }
    );
  }
}

// DELETE service package
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.servicePackage.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Service package deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting service package:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Service package not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete service package' },
      { status: 500 }
    );
  }
}
