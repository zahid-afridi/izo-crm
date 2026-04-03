import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { logActivity } from '@/lib/activity-logger';

/**
 * GET website manager dashboard data
 * Returns all website content that can be managed
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin', 'website_manager']);
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section'); // products, services, projects, blogs, etc.

    let data: any = {};

    if (!section || section === 'overview') {
      // Get overview of all website content
      const [
        productsCount,
        servicesCount,
        projectsCount,
        blogsCount,
        videosCount,
        slidersCount,
      ] = await Promise.all([
        prisma.product.count({ where: { publishOnWebsite: true } }),
        prisma.service.count({ where: { publishOnWebsite: true } }),
        prisma.project.count({ where: { publishOnWebsite: true } }),
        prisma.blog.count({ where: { publishOnWebsite: true } }),
        prisma.video.count({ where: { publishOnWebsite: true } }),
        prisma.websiteSlider.count({ where: { isActive: true } }),
      ]);

      data = {
        productsCount,
        servicesCount,
        projectsCount,
        blogsCount,
        videosCount,
        slidersCount,
      };
    }

    if (!section || section === 'products') {
      data.products = await prisma.product.findMany({
        where: { publishOnWebsite: true },
        include: { subcategory: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    if (!section || section === 'services') {
      data.services = await prisma.service.findMany({
        where: { publishOnWebsite: true },
        include: {
          category: true,
          subcategory: { include: { category: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    if (!section || section === 'projects') {
      data.projects = await prisma.project.findMany({
        where: { publishOnWebsite: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    if (!section || section === 'blogs') {
      data.blogs = await prisma.blog.findMany({
        where: { publishOnWebsite: true },
        include: { category: true },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      });
    }

    if (!section || section === 'sliders') {
      data.sliders = await prisma.websiteSlider.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });
    }

    if (!section || section === 'company-info') {
      data.companyInfo = await prisma.companyInfo.findFirst();
    }

    if (!section || section === 'we-work-with') {
      data.weWorkWith = await prisma.weWorkWith.findMany({
        orderBy: { displayOrder: 'asc' },
      });
    }

    if (!section || section === 'settings') {
      data.settings = await prisma.websiteSettings.findFirst();
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching website manager data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website manager data' },
      { status: 500 }
    );
  }
}

/**
 * POST - Update website content visibility and ordering
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin', 'website_manager']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { action, resourceType, resourceId, data } = body;

    if (!action || !resourceType || !resourceId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, resourceType, resourceId' },
        { status: 400 }
      );
    }

    let result: any;

    // Handle different resource types
    switch (resourceType) {
      case 'product':
        result = await prisma.product.update({
          where: { id: resourceId },
          data: {
            publishOnWebsite: data?.publishOnWebsite ?? undefined,
            enableOnlineSales: data?.enableOnlineSales ?? undefined,
          },
        });
        break;

      case 'service':
        result = await prisma.service.update({
          where: { id: resourceId },
          data: {
            publishOnWebsite: data?.publishOnWebsite ?? undefined,
            enableOnlineSales: data?.enableOnlineSales ?? undefined,
          },
        });
        break;

      case 'project':
        result = await prisma.project.update({
          where: { id: resourceId },
          data: {
            publishOnWebsite: data?.publishOnWebsite ?? undefined,
            featured: data?.featured ?? undefined,
          },
        });
        break;

      case 'blog':
        result = await prisma.blog.update({
          where: { id: resourceId },
          data: {
            publishOnWebsite: data?.publishOnWebsite ?? undefined,
            showOnHomepage: data?.showOnHomepage ?? undefined,
            featured: data?.featured ?? undefined,
          },
        });
        break;

      case 'slider':
        result = await prisma.websiteSlider.update({
          where: { id: resourceId },
          data: {
            isActive: data?.isActive ?? undefined,
            displayOrder: data?.displayOrder ?? undefined,
          },
        });
        break;

      default:
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
      resourceId,
      resourceName: data?.title || resourceType,
      description: `Updated ${resourceType} visibility/settings`,
      changes: data,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error updating website content:', error);
    return NextResponse.json(
      { error: 'Failed to update website content' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update website settings
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin', 'website_manager']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { websiteTitle, metaDescription, metaKeywords } = body;

    // Get or create settings
    let settings = await prisma.websiteSettings.findFirst();

    if (!settings) {
      // Create new settings if they don't exist
      settings = await prisma.websiteSettings.create({
        data: {
          websiteTitle: websiteTitle || '',
          metaDescription: metaDescription || '',
          metaKeywords: metaKeywords || '',
        },
      });
    } else {
      // Update existing settings
      settings = await prisma.websiteSettings.update({
        where: { id: settings.id },
        data: {
          websiteTitle: websiteTitle ?? settings.websiteTitle,
          metaDescription: metaDescription ?? settings.metaDescription,
          metaKeywords: metaKeywords ?? settings.metaKeywords,
        },
      });
    }

    // Log the action
    await logActivity({
      userId: auth.user!.userId,
      action: 'update',
      module: 'website-manager',
      resourceId: settings.id,
      resourceName: 'Website Settings',
      description: 'Updated website settings (title, meta description, keywords)',
      changes: { websiteTitle, metaDescription, metaKeywords },
    });

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error('Error updating website settings:', error);
    return NextResponse.json(
      { error: 'Failed to update website settings' },
      { status: 500 }
    );
  }
}
