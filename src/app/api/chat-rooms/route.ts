import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const rooms = await prisma.chatRoom.findMany({
      where: {
        members: {
          some: {
            userId,
            isApproved: true,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                username: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Get current user to check role
    const currentUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    const isAdmin = currentUser?.role === 'admin';

    // Transform rooms: for direct messages, show the OTHER participant's name
    // When user chats with admin: show "Admin". When admin chats with user: show user's name.
    const transformedRooms = rooms.map(room => {
      if (!room.isGroup && room.members.length === 2) {
        const otherMember = room.members.find(m => m.userId !== userId);
        if (otherMember) {
          let displayName: string;
          if (otherMember.user.role === 'admin' && !isAdmin) {
            displayName = 'Admin';
          } else {
            displayName = otherMember.user.fullName || otherMember.user.email || otherMember.user.username || 'Unknown';
          }
          return { ...room, name: displayName };
        }
      }
      return room;
    });

    return NextResponse.json({ rooms: transformedRooms });
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat rooms' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, teamName, memberIds } = body;

    if (!adminId || !teamName || !memberIds || !Array.isArray(memberIds)) {
      return NextResponse.json(
        { error: 'adminId, teamName, and memberIds are required' },
        { status: 400 }
      );
    }

    // Verify admin permissions
    const admin = await prisma.users.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create teams' },
        { status: 403 }
      );
    }

    // Check for duplicate team name
    const existingTeam = await prisma.chatRoom.findFirst({
      where: { 
        name: teamName,
        isGroup: true 
      }
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: 'A team with this name already exists' },
        { status: 409 }
      );
    }

    // Validate all member IDs exist
    const members = await prisma.users.findMany({
      where: { id: { in: memberIds } }
    });

    if (members.length !== memberIds.length) {
      return NextResponse.json(
        { error: 'Some selected users do not exist' },
        { status: 400 }
      );
    }

    // Create team room
    const room = await prisma.chatRoom.create({
      data: {
        name: teamName,
        isGroup: true,
        members: {
          create: [
            { userId: adminId, isApproved: true },
            ...memberIds.map((memberId: string) => ({
              userId: memberId,
              isApproved: true,
            })),
          ],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });

    return NextResponse.json({ room });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');

    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'roomId and userId are required' },
        { status: 400 }
      );
    }

    // Verify admin permissions
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete teams' },
        { status: 403 }
      );
    }

    // Verify the room exists and is a group
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { 
        members: {
          include: {
            user: { select: { id: true, fullName: true, role: true } }
          }
        }
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    if (!room.isGroup) {
      return NextResponse.json(
        { error: 'Cannot delete direct message rooms' },
        { status: 400 }
      );
    }

    // Delete the room (cascade will delete messages and members)
    await prisma.chatRoom.delete({
      where: { id: roomId },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Team deleted successfully',
      deletedRoom: { id: roomId, name: room.name }
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
