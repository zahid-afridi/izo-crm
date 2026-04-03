import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all service packages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'all') where.status = status;

    const packages = await prisma.servicePackage.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Enrich packages with product and service details
    const enrichedPackages = await Promise.all(
      packages.map(async (pkg) => {
        const serviceIds = (pkg.services as any[] || [])
          .map((s) => s?.id)
          .filter((id) => id !== undefined && id !== null);
        const productIds = (pkg.products as any[] || [])
          .map((p) => p?.id)
          .filter((id) => id !== undefined && id !== null);

        const services = serviceIds.length > 0 ? await prisma.service.findMany({
          where: { id: { in: serviceIds } },
        }) : [];

        const products = productIds.length > 0 ? await prisma.product.findMany({
          where: { id: { in: productIds } },
        }) : [];

        const enrichedServices = (pkg.services as any[] || []).map((s) => ({
          ...s,
          details: services.find((srv) => srv.id === s?.id),
        }));

        const enrichedProducts = (pkg.products as any[] || []).map((p) => ({
          ...p,
          details: products.find((prod) => prod.id === p?.id),
        }));

        return {
          ...pkg,
          services: enrichedServices,
          products: enrichedProducts,
        };
      })
    );

    return NextResponse.json({ packages: enrichedPackages }, { status: 200 });
  } catch (error) {
    console.error('Error fetching service packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service packages' },
      { status: 500 }
    );
  }
}

// POST create new service package
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, description, unit, price, status, services, products } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Package name is required' },
        { status: 400 }
      );
    }

    if (!price) {
      return NextResponse.json(
        { error: 'Package price is required' },
        { status: 400 }
      );
    }

    const servicePackage = await prisma.servicePackage.create({
      data: {
        name,
        description: description || null,
        unit: unit || 'm²',
        price: parseFloat(price),
        status: status || 'active',
        services: services || [],
        products: products || [],
      },
    });

    return NextResponse.json(
      { message: 'Service package created successfully', package: servicePackage },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating service package:', error);
    return NextResponse.json(
      { error: 'Failed to create service package' },
      { status: 500 }
    );
  }
}
