import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/S3';
import { generateOfferPdf, loadOfferPdfBranding } from '@/lib/offers/generateOfferPdf';

function extractS3Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    if (key.startsWith('izogrup-ontop/')) {
      key = key.slice('izogrup-ontop/'.length);
    }
    return key;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', url, error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const existingShared = await prisma.sharedOffer.findFirst({
      where: {
        offerId: offerId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingShared) {
      return NextResponse.json({
        success: true,
        url: existingShared.cloudinaryUrl,
        public_id: existingShared.cloudinaryPublicId,
        filename: existingShared.filename,
        isExisting: true,
      });
    }

    const branding = await loadOfferPdfBranding();
    const pdfBuffer = await generateOfferPdf(offer, branding);

    const filename = offer.offerNumber ? `${offer.offerNumber}.pdf` : `offer-${offerId}.pdf`;

    const base64PDF = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    const uploadResult = await uploadFile(base64PDF, 'izo/offers');

    const sharedOffer = await prisma.sharedOffer.create({
      data: {
        offerId: offerId,
        filename: filename,
        cloudinaryUrl: uploadResult.url,
        cloudinaryPublicId: extractS3Key(uploadResult.url) || '',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      public_id: extractS3Key(uploadResult.url),
      filename: filename,
      sharedId: sharedOffer.id,
      expiresAt: sharedOffer.expiresAt,
    });
  } catch (error) {
    console.error('Error sharing offer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
