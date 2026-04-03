import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { logActivity } from '@/lib/activity-logger';

/**
 * POST - Bulk update product visibility and online sales status
 * Allows updating multiple products or by category
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin', 'website_manager']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const {
      action, // 'publish', 'unpublish', 'enable-sales', 'disable-sales'
      resourceType, // 'product', 'service'
      resourceIds, // array of IDs
      categoryId, // optional: update all in category
      publishOnWebsite,
      enableOnlineSales,
    } = body;

    if (!action || !resourceType) {
      return NextResponse.json(
        { error: 'Missing required fields: action, resourceType' },
        { status: 400 }
      );
    }

    if (!resourceIds?.length && !categoryId) {
      return NextResponse.json(
        { error: 'Either resourceIds or categoryId must be provided' },
        { status: 400 }
      );
    }

    let where: any = {};
    let updateData: any = {};

    // Build where clause
    if (resourceIds?.length) {
      where.id = { in: resourceIds };
    } else if (categoryId) {
      if (resourceType === 'product') {
        where.subcategoryId = categoryId;
      } else if (resourceType === 'service') {
        where.subcategoryId = categoryId;
      }
    }

    // Build update data based on action
    switch (action) {
      case 'publish':
        updateData.publishOnWebsite = true;
        break;
      case 'unpublish':
        updateData.publishOnWebsite = false;
        break;
      case 'enable-sales':
        updateData.enableOnlineSales = true;
        break;
      case 'disable-sales':
        updateData.enableOnlineSales = false;
        break;
      default:
        if (publishOnWebsite !== undefined) updateData.publishOnWebsite = publishOnWebsite;
        if (enableOnlineSales !== undefined) updateData.enableOnlineSales = enableOnlineSales;
    }

    let result: any;

    if (resourceType === 'product') {
      result = await prisma.product.updateMany({
        where,
        data: updateData,
      });
    } else if (resourceType === 'service') {
      result = await prisma.service.updateMany({
        where,
        data: updateData,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid resource type' },
        { status: 400 }
      );
    }

    // Log the action
    await logActivity({
      userId: auth.user!.userId,
      action: 'update',
      module: 'website-manager',
      resourceName: `Bulk update ${resourceType}s`,
      description: `Bulk ${action} for ${result.count} ${resourceType}s`,
      changes: {
        action,
        resourceType,
        count: result.count,
        ...updateData,
      },
    });

    return NextResponse.json(
      {
        message: `Successfully updated ${result.count} ${resourceType}s`,
        count: result.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error bulk updating website content:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update website content' },
      { status: 500 }
    );
  }
}
