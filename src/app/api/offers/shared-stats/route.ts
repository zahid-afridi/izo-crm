import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get statistics about shared offers
    const stats = await prisma.sharedOffer.aggregate({
      _count: { id: true },
      _sum: { downloadCount: true },
      _avg: { downloadCount: true },
      _max: { downloadCount: true }
    });

    const recentShares = await prisma.sharedOffer.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        offer: {
          select: {
            offerNumber: true,
            client: true,
            title: true,
            totalAmount: true
          }
        }
      }
    });

    const expiredCount = await prisma.sharedOffer.count({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    const activeCount = await prisma.sharedOffer.count({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    return NextResponse.json({
      totalShares: stats._count.id || 0,
      totalDownloads: stats._sum.downloadCount || 0,
      averageDownloads: stats._avg.downloadCount || 0,
      maxDownloads: stats._max.downloadCount || 0,
      activeShares: activeCount,
      expiredShares: expiredCount,
      recentShares: recentShares.map(share => ({
        id: share.id,
        filename: share.filename,
        downloadCount: share.downloadCount,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        offer: share.offer
      }))
    });

  } catch (error) {
    console.error('Error getting shared offers stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}