import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-middleware';

const prisma = new PrismaClient();

// GET /api/clients - List all clients with search and filter
export async function GET(request: NextRequest) {
  try {
    // Allow read access for roles that need to view clients
    const auth = requireRole(request, ['admin', 'sales_agent', 'offer_manager', 'order_manager']);
    if (!auth.authorized) return auth.response!;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status !== 'all') {
      where.status = status;
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ clients }, { status: 200 });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    // Only allow creation for roles that can manage clients (exclude order_manager)
    const auth = requireRole(request, ['admin', 'sales_agent', 'offer_manager']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { fullName, email, phone, dateOfBirth, idNumber, address, status } = body;

    // Validation
    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'Full name and email are required' },
        { status: 400 }
      );
    }

    // Check if client name already exists (case-insensitive)
    const existingClientByName = await prisma.client.findFirst({
      where: { 
        fullName: { 
          equals: fullName.trim(),
          mode: 'insensitive' 
        } 
      },
    });

    if (existingClientByName) {
      return NextResponse.json(
        { error: 'A client with this name already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingClientByEmail = await prisma.client.findUnique({
      where: { email },
    });

    if (existingClientByEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        fullName: fullName.trim(),
        email,
        phone: phone || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        idNumber: idNumber || null,
        address: address || null,
        status: status || 'active',
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
