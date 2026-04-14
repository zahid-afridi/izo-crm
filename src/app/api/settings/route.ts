import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-middleware';
import { deleteFile } from '@/lib/S3';
import { extractS3KeyFromUrl, normalizeCompanySettingPayload } from '@/lib/settings/sanitize';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const settings = await prisma.companySetting.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const existing = await prisma.companySetting.findFirst();
    if (existing) {
      return NextResponse.json({ error: 'Settings already exist' }, { status: 409 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const payload = normalizeCompanySettingPayload(body);
    const settings = await prisma.companySetting.create({ data: payload });

    return NextResponse.json({ settings }, { status: 201 });
  } catch (error) {
    console.error('Error creating settings:', error);
    return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const body = (await request.json()) as Record<string, unknown>;
    const payload = normalizeCompanySettingPayload(body);

    const existing = await prisma.companySetting.findFirst();
    if (!existing) {
      const created = await prisma.companySetting.create({ data: payload });
      return NextResponse.json({ settings: created }, { status: 201 });
    }

    if (existing.logoUrl && existing.logoUrl !== payload.logoUrl) {
      const oldKey = extractS3KeyFromUrl(existing.logoUrl);
      if (oldKey) {
        try {
          await deleteFile(oldKey);
        } catch (deleteError) {
          console.error('Failed deleting old settings logo:', deleteError);
        }
      }
    }

    const updated = await prisma.companySetting.update({
      where: { id: existing.id },
      data: payload,
    });

    return NextResponse.json({ settings: updated }, { status: 200 });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const existing = await prisma.companySetting.findFirst();
    if (!existing) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    if (existing.logoUrl) {
      const key = extractS3KeyFromUrl(existing.logoUrl);
      if (key) {
        try {
          await deleteFile(key);
        } catch (deleteError) {
          console.error('Failed deleting settings logo on remove:', deleteError);
        }
      }
    }

    await prisma.companySetting.delete({ where: { id: existing.id } });
    return NextResponse.json({ message: 'Settings deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting settings:', error);
    return NextResponse.json({ error: 'Failed to delete settings' }, { status: 500 });
  }
}
