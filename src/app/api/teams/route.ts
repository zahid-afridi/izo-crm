import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET /api/teams - List all teams with search and filter
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { teamLead: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Status filter
    if (status !== 'all') {
      where.status = status;
    }

    const teams = await prisma.team.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    // Fetch member details for each team
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
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

        const teamWithMembers = {
          ...team,
          members,
          memberCount: team.memberIds.length, // Team lead is already included in memberIds
        };

        console.log(`Team "${team.name}": memberIds=${JSON.stringify(team.memberIds)}, memberCount=${team.memberIds.length}, teamLeadId=${team.teamLeadId}, memberIds includes lead: ${team.memberIds.includes(team.teamLeadId)}, duplicates: ${team.memberIds.length !== new Set(team.memberIds).size ? 'YES' : 'NO'}`);
        
        return teamWithMembers;
      })
    );

    return NextResponse.json({ teams: teamsWithMembers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create new team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, teamLeadId, memberIds: rawMemberIds, status } = body;

    // Type validation and conversion
    if (!Array.isArray(rawMemberIds)) {
      return NextResponse.json(
        { error: 'memberIds must be an array' },
        { status: 400 }
      );
    }

    // Convert to string array and validate
    const memberIds: string[] = rawMemberIds.filter((id): id is string => 
      typeof id === 'string' && id.trim() !== ''
    );

    // Validation
    if (!name || !teamLeadId) {
      return NextResponse.json(
        { error: 'Team name and team lead are required' },
        { status: 400 }
      );
    }

    if (!memberIds || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one team member is required' },
        { status: 400 }
      );
    }

    // Verify team lead exists and is a worker
    const teamLead = await prisma.users.findUnique({
      where: { id: teamLeadId },
      include: { worker: true },
    });

    if (!teamLead || teamLead.role !== 'worker') {
      return NextResponse.json(
        { error: 'Team lead must be a worker' },
        { status: 400 }
      );
    }

    if (teamLead.isLocked) {
      return NextResponse.json(
        { error: 'Team lead cannot be a locked worker' },
        { status: 400 }
      );
    }

    // Ensure team lead is included in memberIds and remove duplicates
    const uniqueMemberIds: string[] = [...new Set(memberIds)]; // Remove duplicates first
    if (!uniqueMemberIds.includes(teamLeadId)) {
      uniqueMemberIds.push(teamLeadId);
    }

    console.log(`Creating team "${name}": teamLeadId=${teamLeadId}, memberIds=${JSON.stringify(uniqueMemberIds)}, originalMemberIds=${JSON.stringify(memberIds)}`);

    // Verify all members are workers
    const members = await prisma.users.findMany({
      where: {
        id: { in: uniqueMemberIds },
      },
      include: { worker: true },
    });

    if (members.length !== uniqueMemberIds.length) {
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

    // Create team
    const team = await prisma.team.create({
      data: {
        name,
        description: description || null,
        teamLeadId,
        memberIds: uniqueMemberIds, // Use cleaned memberIds
        status: status || 'active',
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
    const teamMembers = await prisma.users.findMany({
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

    // ✅ Automatically create a chat room for the team
    // Team lead is already included in memberIds, so just use memberIds
    const chatRoom = await prisma.chatRoom.create({
      data: {
        name: `Team: ${name}`, // Chat room name matches team name
        isGroup: true,
        members: {
          create: uniqueMemberIds.map((memberId: string) => ({
            userId: memberId,
            isApproved: true, // All team members are auto-approved
          })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
    });

    // Create notifications for all team members (including team lead)
    await prisma.notification.createMany({
      data: uniqueMemberIds.map((memberId) => ({
        userId: memberId,
        title: 'Added to team',
        message: `You have been added to team "${name}".`,
        module: 'teams',
        type: 'team_member_added',
        data: {
          teamId: team.id,
          teamName: team.name,
          teamLeadId,
        },
      })),
    });

    console.log(`✅ Team "${name}" created with ${team.memberIds.length} members and chat room ID: ${chatRoom.id}`);

    return NextResponse.json(
      {
        team: {
          ...team,
          members: teamMembers,
          memberCount: team.memberIds.length, // Use actual memberIds length
        },
        chatRoom: {
          id: chatRoom.id,
          name: chatRoom.name,
          message: 'Team chat room created automatically. Members should refresh their chat page to see it.',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
