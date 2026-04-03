import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sharedId } = await params;

    // Find the shared offer
    const sharedOffer = await prisma.sharedOffer.findUnique({
      where: { id: sharedId },
      include: { offer: true }
    });

    if (!sharedOffer) {
      return NextResponse.json({ error: 'Shared offer not found' }, { status: 404 });
    }

    // Check if expired
    if (sharedOffer.expiresAt && sharedOffer.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This shared offer has expired' }, { status: 410 });
    }

    // Update download count and last downloaded time
    await prisma.sharedOffer.update({
      where: { id: sharedId },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadedAt: new Date()
      }
    });

    // Redirect to Cloudinary URL
    return NextResponse.redirect(sharedOffer.cloudinaryUrl);

  } catch (error) {
    console.error('Error accessing shared offer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}