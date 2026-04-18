import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '50'); // Increased default limit
    const type = searchParams.get('type'); // Optional filter by type

    if (!query || query.trim().length < 1) { // Reduced minimum length to 1
      return NextResponse.json({ 
        error: 'Query must be at least 1 character long' 
      }, { status: 400 });
    }

    const searchTerm = query.trim();
    const results: any[] = [];

    // Search in different entities based on user role and permissions
    const userRole = authResult.user.role;

    // Search Products - Enhanced search fields
    if (!type || type === 'products') {
      const products = await prisma.product.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { sku: { contains: searchTerm, mode: 'insensitive' } },
            { unit: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          title: true,
          description: true,
          sku: true,
          price: true,
          images: true,
          status: true,
          unit: true
        },
        take: Math.min(limit, 25), // Increased per-category limit
        orderBy: [
          { title: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      results.push(...products.map(product => ({
        id: product.id,
        type: 'product',
        title: product.title,
        description: product.description,
        subtitle: `SKU: ${product.sku || 'N/A'} • Price: €${product.price || 0} • Status: ${product.status}`,
        image: product.images?.[0] || null,
        url: `/products/${product.id}`,
        category: 'Products'
      })));
    }

    // Search Services - Enhanced
    if (!type || type === 'services') {
      const services = await prisma.service.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          images: true
        },
        take: Math.min(limit, 25),
        orderBy: [
          { title: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      results.push(...services.map(service => ({
        id: service.id,
        type: 'service',
        title: service.title,
        description: service.description,
        subtitle: `Price: €${service.price || 0}`,
        image: service.images?.[0] || null,
        url: `/services/${service.id}`,
        category: 'Services'
      })));
    }

    // Search Clients - Enhanced search fields
    if (!type || type === 'clients') {
      const clients = await prisma.client.findMany({
        where: {
          OR: [
            { fullName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } },
            { address: { contains: searchTerm, mode: 'insensitive' } },
            { idNumber: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          address: true,
          status: true,
          idNumber: true
        },
        take: Math.min(limit, 25),
        orderBy: [
          { fullName: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      results.push(...clients.map(client => ({
        id: client.id,
        type: 'client',
        title: client.fullName,
        description: client.address,
        subtitle: `${client.email} • ${client.phone || 'No phone'} • Status: ${client.status}`,
        image: null,
        url: `/clients/${client.id}`,
        category: 'Clients'
      })));
    }

    // Search Sites - Enhanced
    if (!type || type === 'sites') {
      const sites = await prisma.site.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { address: { contains: searchTerm, mode: 'insensitive' } },
            { city: { contains: searchTerm, mode: 'insensitive' } },
            { client: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { postalCode: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: {
          siteManager: {
            select: {
              fullName: true
            }
          }
        },
        take: Math.min(limit, 25),
        orderBy: [
          { name: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      results.push(...sites.map(site => ({
        id: site.id,
        type: 'site',
        title: site.name,
        description: `${site.address}, ${site.city || ''}`,
        subtitle: `Client: ${site.client || 'N/A'} • Status: ${site.status} • Progress: ${site.progress}% • Manager: ${site.siteManager?.fullName || 'N/A'}`,
        image: null,
        url: `/sites/${site.id}`,
        category: 'Sites'
      })));
    }

    // Search Workers/Users - Enhanced with all roles
    if (!type || type === 'workers') {
      const workers = await prisma.users.findMany({
        where: {
          OR: [
            { fullName: { contains: searchTerm, mode: 'insensitive' } },
            { username: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } },
            { address: { contains: searchTerm, mode: 'insensitive' } },
            { idNumber: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          role: true,
          phone: true,
          status: true,
          address: true
        },
        take: Math.min(limit, 25),
        orderBy: [
          { fullName: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      results.push(...workers.map(worker => ({
        id: worker.id,
        type: 'worker',
        title: worker.fullName,
        description: worker.email,
        subtitle: `@${worker.username} • ${worker.role} • ${worker.phone || 'No phone'} • Status: ${worker.status}`,
        image: null,
        url: `/workers/${worker.id}`,
        category: 'Workers'
      })));
    }

    // Search Orders - Enhanced
    if (!type || type === 'orders') {
      const orders = await prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: searchTerm, mode: 'insensitive' } },
            { client: { contains: searchTerm, mode: 'insensitive' } },
            { orderTitle: { contains: searchTerm, mode: 'insensitive' } },
            { deliveryAddress: { contains: searchTerm, mode: 'insensitive' } },
            { notes: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          orderNumber: true,
          orderTitle: true,
          client: true,
          orderStatus: true,
          paymentStatus: true,
          totalAmount: true,
          orderDate: true
        },
        take: Math.min(limit, 25),
        orderBy: [
          { orderDate: 'desc' },
          { orderNumber: 'asc' }
        ]
      });

      results.push(...orders.map(order => ({
        id: order.id,
        type: 'order',
        title: `${order.orderNumber}${order.orderTitle ? ` - ${order.orderTitle}` : ''}`,
        description: `Client: ${order.client || 'N/A'}`,
        subtitle: `Order Status: ${order.orderStatus} • Payment: ${order.paymentStatus} • Total: €${order.totalAmount} • ${order.orderDate.toLocaleDateString()}`,
        image: null,
        url: `/orders/${order.id}`,
        category: 'Orders'
      })));
    }

    // Search Offers - Enhanced
    if (!type || type === 'offers') {
      const offers = await prisma.offer.findMany({
        where: {
          OR: [
            { offerNumber: { contains: searchTerm, mode: 'insensitive' } },
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { client: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { notes: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          offerNumber: true,
          title: true,
          client: true,
          offerStatus: true,
          totalAmount: true,
          offerDate: true,
          validUntil: true
        },
        take: Math.min(limit, 25),
        orderBy: [
          { offerDate: 'desc' },
          { offerNumber: 'asc' }
        ]
      });

      results.push(...offers.map(offer => ({
        id: offer.id,
        type: 'offer',
        title: `${offer.offerNumber} - ${offer.title}`,
        description: `Client: ${offer.client || 'N/A'}`,
        subtitle: `Status: ${offer.offerStatus} • Total: €${offer.totalAmount}`,
        image: null,
        url: `/offers/${offer.id}`,
        category: 'Offers'
      })));
    }

    // Search Cars - Enhanced
    if (!type || type === 'cars') {
      const cars = await prisma.car.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { number: { contains: searchTerm, mode: 'insensitive' } },
            { model: { contains: searchTerm, mode: 'insensitive' } },
            { color: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          number: true,
          model: true,
          color: true,
          status: true,
          isLocked: true
        },
        take: Math.min(limit, 25),
        orderBy: [
          { name: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      results.push(...cars.map(car => ({
        id: car.id,
        type: 'car',
        title: car.name,
        description: `${car.model} - ${car.color}`,
        subtitle: `Number: ${car.number} • Status: ${car.status} • ${car.isLocked ? 'Locked' : 'Available'}`,
        image: null,
        url: `/cars/${car.id}`,
        category: 'Cars'
      })));
    }

    // Enhanced sorting by relevance
    const sortedResults = results.sort((a, b) => {
      const searchLower = searchTerm.toLowerCase();
      
      // Exact title matches first
      const aExactTitle = a.title.toLowerCase() === searchLower;
      const bExactTitle = b.title.toLowerCase() === searchLower;
      if (aExactTitle && !bExactTitle) return -1;
      if (!aExactTitle && bExactTitle) return 1;
      
      // Title starts with search term
      const aStartsTitle = a.title.toLowerCase().startsWith(searchLower);
      const bStartsTitle = b.title.toLowerCase().startsWith(searchLower);
      if (aStartsTitle && !bStartsTitle) return -1;
      if (!aStartsTitle && bStartsTitle) return 1;
      
      // Title contains search term
      const aContainsTitle = a.title.toLowerCase().includes(searchLower);
      const bContainsTitle = b.title.toLowerCase().includes(searchLower);
      if (aContainsTitle && !bContainsTitle) return -1;
      if (!aContainsTitle && bContainsTitle) return 1;
      
      // Alphabetical by title
      return a.title.localeCompare(b.title);
    });

    // Group results by category for better organization
    const groupedResults = sortedResults.reduce((acc, result) => {
      const category = result.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(result);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      query: searchTerm,
      results: sortedResults.slice(0, limit),
      groupedResults,
      total: sortedResults.length,
      hasMore: sortedResults.length > limit,
      categories: Object.keys(groupedResults),
      stats: {
        products: groupedResults.Products?.length || 0,
        services: groupedResults.Services?.length || 0,
        clients: groupedResults.Clients?.length || 0,
        sites: groupedResults.Sites?.length || 0,
        workers: groupedResults.Workers?.length || 0,
        orders: groupedResults.Orders?.length || 0,
        offers: groupedResults.Offers?.length || 0,
        cars: groupedResults.Cars?.length || 0
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}