import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BRAND_HEX } from '@/lib/settings/defaults';
import { sanitizeHex } from '@/lib/settings/sanitize';

/** Public read-only branding for login + shell (no auth). */
export async function GET() {
  try {
    const row = await prisma.companySetting.findFirst({
      orderBy: { createdAt: 'asc' },
      select: {
        logoUrl: true,
        companyDisplayName: true,
        tagline: true,
        brandColorStart: true,
        brandColorMid: true,
        brandColorEnd: true,
      },
    });

    const branding = {
      logoUrl: row?.logoUrl?.trim() || null,
      companyDisplayName: row?.companyDisplayName?.trim() || null,
      tagline: row?.tagline?.trim() || null,
      brandColorStart: sanitizeHex(row?.brandColorStart, BRAND_HEX.start),
      brandColorMid: sanitizeHex(row?.brandColorMid, BRAND_HEX.mid),
      brandColorEnd: sanitizeHex(row?.brandColorEnd, BRAND_HEX.end),
    };

    return NextResponse.json({ branding }, { status: 200 });
  } catch (error) {
    console.error('Error fetching public branding:', error);
    return NextResponse.json(
      {
        branding: {
          logoUrl: null,
          companyDisplayName: null,
          tagline: null,
          brandColorStart: BRAND_HEX.start,
          brandColorMid: BRAND_HEX.mid,
          brandColorEnd: BRAND_HEX.end,
        },
      },
      { status: 200 }
    );
  }
}
