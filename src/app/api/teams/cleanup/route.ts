import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// POST /api/teams/cleanup - Clean up team data inconsistencies
export async function POST(request: NextRequest) {
  try {
    console.log('Starting team data cleanup...');

    // Get all teams
    const teams = await prisma.team.findMany({
      include: {
        teamLead: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    const cleanupResults = [];

    for (const team of teams) {
      const originalMemberIds = team.memberIds;
      const originalCount = originalMemberIds.length;

      // Remove duplicates from memberIds
      const uniqueMemberIds = [...new Set(originalMemberIds)];

      // Ensure team lead is included
      if (!uniqueMemberIds.includes(team.teamLeadId)) {
        uniqueMemberIds.push(team.teamLeadId);
      }

      const newCount = uniqueMemberIds.length;
      const hasDuplicates = originalCount !== uniqueMemberIds.length;
      const missingTeamLead = !originalMemberIds.includes(team.teamLeadId);

      // Update team if there are changes
      if (hasDuplicates || missingTeamLead) {
        await prisma.team.update({
          where: { id: team.id },
          data: {
            memberIds: uniqueMemberIds,
          },
        });

        cleanupResults.push({
          teamId: team.id,
          teamName: team.name,
          teamLeadName: team.teamLead.fullName,
          originalCount,
          newCount,
          hasDuplicates,
          missingTeamLead,
          originalMemberIds,
          cleanedMemberIds: uniqueMemberIds,
        });

        console.log(`✅ Cleaned team "${team.name}": ${originalCount} → ${newCount} members`);
      } else {
        console.log(`✓ Team "${team.name}" is already clean: ${originalCount} members`);
      }
    }

    const summary = {
      totalTeams: teams.length,
      teamsFixed: cleanupResults.length,
      teamsAlreadyClean: teams.length - cleanupResults.length,
    };

    console.log('Team cleanup completed:', summary);

    return NextResponse.json(
      {
        message: 'Team data cleanup completed',
        summary,
        details: cleanupResults,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error during team cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup team data' },
      { status: 500 }
    );
  }
}