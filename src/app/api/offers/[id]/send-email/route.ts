import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { generateOfferPdf, loadOfferPdfBranding } from '@/lib/offers/generateOfferPdf';
import { sendSystemMail } from '@/lib/mailer';
import { getEffectiveOfferStatus } from '@/lib/offers/offerStatus';
import { collectTechnicalDocumentAttachments } from '@/lib/offers/collectTechnicalAttachments';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = requireRole(request, ['admin', 'offer_manager']);
  if (!gate.authorized) return gate.response!;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const toOverride = typeof body?.to === 'string' ? body.to.trim() : '';

    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    if (!offer.clientId) {
      return NextResponse.json(
        { error: 'Link a client to this offer before sending email' },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({ where: { id: offer.clientId } });
    if (!client?.email) {
      return NextResponse.json({ error: 'Client email is missing' }, { status: 400 });
    }

    const to = toOverride || client.email;
    const branding = await loadOfferPdfBranding();
    const pdfBuffer = await generateOfferPdf(offer, branding);
    const technicalAttachments = await collectTechnicalDocumentAttachments(offer);

    const filename = offer.offerNumber ? `${offer.offerNumber}.pdf` : `offer-${id}.pdf`;
    const companyName = branding.companyName;

    const attachments: {
      filename: string;
      content: Buffer;
      contentType?: string;
    }[] = [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
      ...technicalAttachments,
    ];

    const docNote =
      technicalAttachments.length > 0
        ? ` The email also includes ${technicalAttachments.length} related document file(s) from the offer line items.`
        : '';

    await sendSystemMail({
      to,
      subject: `Offer ${offer.offerNumber} — ${offer.title}`,
      text: `Dear ${client.fullName},\n\nPlease find our offer "${offer.title}" (${offer.offerNumber}) attached as a PDF.${docNote}\n\nThank you,\n${companyName}`,
      html: `<p>Dear ${escapeHtml(client.fullName)},</p>
<p>Please find our offer <strong>${escapeHtml(offer.offerNumber)}</strong> — <strong>${escapeHtml(offer.title)}</strong> — attached as a PDF.${
        technicalAttachments.length > 0
          ? ` Related technical documents (${technicalAttachments.length}) are attached as separate files.`
          : ''
      }</p>
<p>— ${escapeHtml(companyName)}</p>`,
      attachments,
    });

    await prisma.sharedOffer.deleteMany({ where: { offerId: id } });

    const updated = await prisma.offer.update({
      where: { id },
      data: { offerStatus: 'sent' },
    });

    return NextResponse.json({
      success: true,
      offer: {
        ...updated,
        effectiveStatus: getEffectiveOfferStatus(updated),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    console.error('send-email:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
