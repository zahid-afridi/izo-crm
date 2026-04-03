import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId is required' },
        { status: 400 }
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.chatMessage.count({ where: { roomId } });

    return NextResponse.json({ messages, total });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, senderId, content } = body;

    if (!roomId || !senderId || !content) {
      return NextResponse.json(
        { error: 'roomId, senderId, and content are required' },
        { status: 400 }
      );
    }

    // Verify user is member of the room
    const member = await prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId: senderId } },
    });

    if (!member || !member.isApproved) {
      return NextResponse.json(
        { error: 'Not allowed to send messages to this room' },
        { status: 403 }
      );
    }

    const message = await prisma.chatMessage.create({
      data: { roomId, senderId, content: content.trim() },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    // Update room's updatedAt
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const userId = searchParams.get('userId');

    if (!messageId || !userId) {
      return NextResponse.json(
        { error: 'messageId and userId are required' },
        { status: 400 }
      );
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      }
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });
    
    // Check if user can delete this message (sender or admin)
    if (message.senderId !== userId && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'You can only delete your own messages or admin can delete any message' },
        { status: 403 }
      );
    }

    // Delete the message
    await prisma.chatMessage.delete({
      where: { id: messageId }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Message deleted successfully',
      deletedMessage: { id: messageId, content: message.content }
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
