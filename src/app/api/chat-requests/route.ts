import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json(
        { error: 'adminId is required' },
        { status: 400 }
      );
    }

    // Get all pending chat requests for admin
    // We'll use ChatRoomMember with isApproved=false as pending requests
    // Verify requesting user is admin
    const adminUser = await prisma.users.findUnique({ where: { id: adminId } });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can view chat requests' },
        { status: 403 }
      );
    }

    // Get all pending chat requests for admin
    // We'll use ChatRoomMember with isApproved=false as pending requests
    const pendingRequests = await prisma.chatRoomMember.findMany({
      where: {
        isApproved: false,
        room: {
          isGroup: false, // Only direct message requests
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            username: true,
            role: true
          }
        },
        room: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    username: true,
                    role: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const requests = pendingRequests.map(req => {
      const approvedMember = req.room.members.find(m => m.userId !== req.userId && m.isApproved);
      const isAdminChatRequest = approvedMember?.user.role === 'admin';
      const displayName = req.user.fullName || req.user.email || req.user.username || 'User';
      return {
        id: req.id,
        userId: req.userId,
        userName: displayName,
        userRole: req.user.role,
        userEmail: req.user.email,
        roomId: req.roomId,
        requestDate: req.joinedAt,
        requesterName: isAdminChatRequest ? undefined : (approvedMember?.user.fullName || approvedMember?.user.email),
        isAdminChatRequest,
      };
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching chat requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, requestId, adminId, userId } = body;

    if (!action || !adminId) {
      return NextResponse.json(
        { error: 'action and adminId are required' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      if (!requestId) {
        return NextResponse.json(
          { error: 'requestId is required for approval' },
          { status: 400 }
        );
      }

      // Approve the chat request
      const updatedMember = await prisma.chatRoomMember.update({
        where: { id: requestId },
        data: { isApproved: true },
        include: {
          room: true,
          user: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          }
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Chat request approved',
        room: updatedMember.room
      });
    }

    if (action === 'reject') {
      if (!requestId) {
        return NextResponse.json(
          { error: 'requestId is required for rejection' },
          { status: 400 }
        );
      }

      // Delete the chat request and room if no approved members
      const member = await prisma.chatRoomMember.findUnique({
        where: { id: requestId },
        include: { room: { include: { members: true } } }
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Chat request not found' },
          { status: 404 }
        );
      }

      // Delete the member
      await prisma.chatRoomMember.delete({
        where: { id: requestId }
      });

      // If no approved members left, delete the room
      const approvedMembers = member.room.members.filter(m => m.isApproved && m.id !== requestId);
      if (approvedMembers.length === 0) {
        await prisma.chatRoom.delete({
          where: { id: member.roomId }
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Chat request rejected'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error handling chat request:', error);
    return NextResponse.json(
      { error: 'Failed to handle chat request' },
      { status: 500 }
    );
  }
}