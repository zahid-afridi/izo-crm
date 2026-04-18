import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOfferPdf, loadOfferPdfBranding } from '@/lib/offers/generateOfferPdf';

export async function GET(
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

    const branding = await loadOfferPdfBranding();
    const pdfBuffer = await generateOfferPdf(offer, branding);

    const filename = offer.offerNumber ? `${offer.offerNumber}.pdf` : `offer-${offerId}.pdf`;

    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading offer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
