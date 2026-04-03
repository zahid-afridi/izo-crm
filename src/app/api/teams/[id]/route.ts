import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET /api/teams/[id] - Get single team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        teamLead: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Fetch member details
    const members = await prisma.users.findMany({
      where: {
        id: { in: team.memberIds },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
    });

    return NextResponse.json(
      {
        team: {
          ...team,
          members,
          memberCount: team.memberIds.length, // Team lead is already included in memberIds
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[id] - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, teamLeadId, memberIds, status } = body;

    // Check if team exists
    const existingTeam = await prisma.team.findUnique({
      where: { id },
    });

    if (!existingTeam) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // If team lead is being changed, verify it's a worker
    if (teamLeadId && teamLeadId !== existingTeam.teamLeadId) {
      const newTeamLead = await prisma.users.findUnique({
        where: { id: teamLeadId },
      });

      if (!newTeamLead || newTeamLead.role !== 'worker') {
        return NextResponse.json(
          { error: 'Team lead must be a worker' },
          { status: 400 }
        );
      }
      if (newTeamLead.isLocked) {
        return NextResponse.json(
          { error: 'Team lead cannot be a locked worker' },
          { status: 400 }
        );
      }
    }

    // If members are being changed, verify they're all workers
    let finalMemberIds = memberIds;
    if (memberIds && memberIds.length > 0) {
      // Ensure team lead is included in memberIds and remove duplicates
      const finalTeamLeadId = teamLeadId || existingTeam.teamLeadId;
      const uniqueMemberIds = [...new Set(memberIds)]; // Remove duplicates first
      if (!uniqueMemberIds.includes(finalTeamLeadId)) {
        uniqueMemberIds.push(finalTeamLeadId);
      }
      finalMemberIds = uniqueMemberIds;

      console.log(`Updating team "${existingTeam.name}": teamLeadId=${finalTeamLeadId}, memberIds=${JSON.stringify(finalMemberIds)}, originalMemberIds=${JSON.stringify(memberIds)}`);

      const members = await prisma.users.findMany({
        where: {
          id: { in: finalMemberIds },
        },
      });

      if (members.length !== finalMemberIds.length) {
        return NextResponse.json(
          { error: 'Some members not found' },
          { status: 400 }
        );
      }

      for (const member of members) {
        if (member.role !== 'worker') {
          return NextResponse.json(
            { error: 'All team members must be workers' },
            { status: 400 }
          );
        }
        if (member.isLocked) {
          return NextResponse.json(
            { error: 'Locked workers cannot be added to teams' },
            { status: 400 }
          );
        }
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        name: name || existingTeam.name,
        description: description !== undefined ? description : existingTeam.description,
        teamLeadId: teamLeadId || existingTeam.teamLeadId,
        memberIds: finalMemberIds || existingTeam.memberIds,
        status: status || existingTeam.status,
      },
      include: {
        teamLead: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Fetch member details
    const members = await prisma.users.findMany({
      where: {
        id: { in: team.memberIds },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
    });

    // ✅ Update corresponding chat room if members changed
    if (memberIds || teamLeadId || name) {
      // Find the chat room for this team (by name pattern)
      const chatRoom = await prisma.chatRoom.findFirst({
        where: {
          name: { startsWith: 'Team:' },
          isGroup: true,
        },
        include: {
          members: true,
        },
      });

      if (chatRoom) {
        // Team lead is already included in memberIds, so just use memberIds
        const existingMemberIds = chatRoom.members.map(m => m.userId);

        // Find members to add and remove
        const membersToAdd = team.memberIds.filter(id => !existingMemberIds.includes(id));
        const membersToRemove = existingMemberIds.filter(id => !team.memberIds.includes(id));

        // Add new members
        if (membersToAdd.length > 0) {
          await prisma.chatRoomMember.createMany({
            data: membersToAdd.map(userId => ({
              roomId: chatRoom.id,
              userId,
              isApproved: true,
            })),
          });
        }

        // Remove old members
        if (membersToRemove.length > 0) {
          await prisma.chatRoomMember.deleteMany({
            where: {
              roomId: chatRoom.id,
              userId: { in: membersToRemove },
            },
          });
        }

        // Update chat room name if team name changed
        if (name && name !== existingTeam.name) {
          await prisma.chatRoom.update({
            where: { id: chatRoom.id },
            data: { name: `Team: ${name}` },
          });
        }

        console.log(`✅ Chat room synced for team "${team.name}"`);
      }
    }

    return NextResponse.json(
      {
        team: {
          ...team,
          members,
          memberCount: team.memberIds.length, // Team lead is already included in memberIds
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // ✅ Delete corresponding chat room when team is deleted
    const chatRoom = await prisma.chatRoom.findFirst({
      where: {
        name: `Team: ${team.name}`,
        isGroup: true,
      },
    });

    if (chatRoom) {
      await prisma.chatRoom.delete({
        where: { id: chatRoom.id },
      });
      console.log(`✅ Chat room deleted for team "${team.name}"`);
    }

    await prisma.team.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Team and associated chat room deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
