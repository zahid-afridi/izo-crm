import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-middleware';

const prisma = new PrismaClient();

// GET /api/clients/[id] - Get single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow read access for roles that need to view clients
    const auth = requireRole(request, ['admin', 'sales_agent', 'offer_manager', 'order_manager']);
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ client }, { status: 200 });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only allow updates for roles that can manage clients (exclude order_manager)
    const auth = requireRole(request, ['admin', 'sales_agent', 'offer_manager']);
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const body = await request.json();
    const { fullName, email, phone, dateOfBirth, idNumber, address, status } = body;

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if name is being changed and if new name already exists
    if (fullName && fullName.trim() !== existingClient.fullName) {
      const nameExists = await prisma.client.findFirst({
        where: { 
          fullName: { 
            equals: fullName.trim(),
            mode: 'insensitive' 
          },
          NOT: { id } // Exclude current client from check
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'A client with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Check if email is being changed and if new email already exists
    if (email && email !== existingClient.email) {
      const emailExists = await prisma.client.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        fullName: fullName ? fullName.trim() : existingClient.fullName,
        email: email || existingClient.email,
        phone: phone !== undefined ? phone : existingClient.phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : existingClient.dateOfBirth,
        idNumber: idNumber !== undefined ? idNumber : existingClient.idNumber,
        address: address !== undefined ? address : existingClient.address,
        status: status || existingClient.status,
      },
    });

    return NextResponse.json({ client }, { status: 200 });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id] - Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only allow deletion for admin (exclude order_manager)
    const auth = requireRole(request, ['admin']);
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Client deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}
