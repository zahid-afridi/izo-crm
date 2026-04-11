import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getAuthUser } from '@/lib/auth-middleware';
import { uploadFile, deleteFile } from '@/lib/S3';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function extractS3Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    if (key.startsWith('izogrup-ontop/')) {
      key = key.slice('izogrup-ontop/'.length);
    }
    return key;
  } catch {
    return null;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: authUser.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.status === 'disabled') {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    let currentPassword = '';
    let newPassword = '';
    let confirmPassword = '';
    let imageFile: File | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
      newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
      confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
    } else {
      const formData = await request.formData();
      currentPassword = (formData.get('currentPassword') as string) || '';
      newPassword = (formData.get('newPassword') as string) || '';
      confirmPassword = (formData.get('confirmPassword') as string) || '';
      const file = formData.get('profileImage');
      if (file instanceof File && file.size > 0) {
        imageFile = file;
      }
    }

    const wantsPasswordChange =
      newPassword.trim().length > 0 ||
      currentPassword.trim().length > 0 ||
      confirmPassword.trim().length > 0;

    const updateData: { password?: string; profile?: string | null } = {};

    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { error: 'Current password, new password, and confirmation are required to change password' },
          { status: 400 }
        );
      }
      const np = newPassword.trim();
      if (np.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }
      if (np !== confirmPassword.trim()) {
        return NextResponse.json({ error: 'New password and confirmation do not match' }, { status: 400 });
      }

      const ok = await verifyPassword(currentPassword, user.password);
      if (!ok) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      updateData.password = await hashPassword(np);
    }

    if (imageFile) {
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Profile image must be an image file' }, { status: 400 });
      }
      if (imageFile.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: 'Image must be 5MB or smaller' }, { status: 400 });
      }

      if (user.profile) {
        const oldKey = extractS3Key(user.profile);
        if (oldKey) {
          try {
            await deleteFile(oldKey);
          } catch {
            // continue even if old object removal fails
          }
        }
      }

      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${imageFile.type};base64,${buffer.toString('base64')}`;
      const { url } = await uploadFile(base64, 'izo/profiles');
      updateData.profile = url;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nothing to update. Provide a new profile image or password fields.' },
        { status: 400 }
      );
    }

    const updated = await prisma.users.update({
      where: { id: user.id },
      data: updateData,
    });

    const { password: _, ...userWithoutPassword } = updated;
    return NextResponse.json({ user: userWithoutPassword, message: 'Profile updated' }, { status: 200 });
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
