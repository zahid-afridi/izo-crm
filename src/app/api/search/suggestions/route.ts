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

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ suggestions: [] });
    }

    const searchTerm = query.trim();
    const suggestions: Array<{text: string, type: string, count?: number}> = [];

    // Get popular product names
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { sku: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: { title: true, sku: true },
      take: 5,
      orderBy: { title: 'asc' }
    });

    suggestions.push(...products.map(p => ({
      text: p.title,
      type: 'product'
    })));

    // Get client names
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { fullName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: { fullName: true },
      take: 5,
      orderBy: { fullName: 'asc' }
    });

    suggestions.push(...clients.map(c => ({
      text: c.fullName,
      type: 'client'
    })));

    // Get site names
    const sites = await prisma.site.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { address: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: { name: true },
      take: 5,
      orderBy: { name: 'asc' }
    });

    suggestions.push(...sites.map(s => ({
      text: s.name,
      type: 'site'
    })));

    // Get worker names
    const workers = await prisma.users.findMany({
      where: {
        OR: [
          { fullName: { contains: searchTerm, mode: 'insensitive' } },
          { username: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: { fullName: true },
      take: 5,
      orderBy: { fullName: 'asc' }
    });

    suggestions.push(...workers.map(w => ({
      text: w.fullName,
      type: 'worker'
    })));

    // Get service names
    const services = await prisma.service.findMany({
      where: {
        title: { contains: searchTerm, mode: 'insensitive' }
      },
      select: { title: true },
      take: 3,
      orderBy: { title: 'asc' }
    });

    suggestions.push(...services.map(s => ({
      text: s.title,
      type: 'service'
    })));

    // Get order numbers
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: searchTerm, mode: 'insensitive' } },
          { client: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: { orderNumber: true },
      take: 3,
      orderBy: { orderDate: 'desc' }
    });

    suggestions.push(...orders.map(o => ({
      text: o.orderNumber,
      type: 'order'
    })));

    // Remove duplicates based on text and sort by relevance
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
      )
      .sort((a, b) => {
        const searchLower = searchTerm.toLowerCase();
        
        // Exact matches first
        const aExact = a.text.toLowerCase() === searchLower;
        const bExact = b.text.toLowerCase() === searchLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Starts with search term
        const aStarts = a.text.toLowerCase().startsWith(searchLower);
        const bStarts = b.text.toLowerCase().startsWith(searchLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Alphabetical
        return a.text.localeCompare(b.text);
      })
      .slice(0, 10);

    return NextResponse.json({ 
      suggestions: uniqueSuggestions.map(s => s.text),
      detailedSuggestions: uniqueSuggestions
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json({ suggestions: [] });
  } finally {
    await prisma.$disconnect();
  }
}