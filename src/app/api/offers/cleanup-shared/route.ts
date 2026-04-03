import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/S3';

export async function POST(request: NextRequest) {
  try {
    // Find expired shared offers
    const expiredShares = await prisma.sharedOffer.findMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    let deletedCount = 0;
    let fileDeletedCount = 0;

    for (const share of expiredShares) {
      try {
        // Delete from Digital Ocean Spaces
        if (share.cloudinaryPublicId) {
          await deleteFile(share.cloudinaryPublicId);
          fileDeletedCount++;
        }
      } catch (fileError) {
        console.error(`Failed to delete file: ${share.cloudinaryPublicId}`, fileError);
      }

      // Delete from database
      await prisma.sharedOffer.delete({
        where: { id: share.id }
      });
      deletedCount++;
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      fileDeletedCount,
      message: `Cleaned up ${deletedCount} expired shared offers`
    });

  } catch (error) {
    console.error('Error cleaning up shared offers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to check expired shares without deleting
export async function GET() {
  try {
    const expiredCount = await prisma.sharedOffer.count({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    const totalCount = await prisma.sharedOffer.count();

    return NextResponse.json({
      expiredCount,
      totalCount,
      activeCount: totalCount - expiredCount
    });

  } catch (error) {
    console.error('Error checking shared offers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}