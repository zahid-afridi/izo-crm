import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryId, status, format, export: shouldExport } = body;

    // Build where clause for filtering
    const where: any = {};
    
    if (categoryId && categoryId !== 'all') {
      // Filter by category (direct category or through subcategory)
      where.OR = [
        { category: { name: categoryId } },
        { subcategory: { category: { name: categoryId } } },
      ];
    }
    
    // Services don't have status field in the schema, so we skip status filtering

    // Fetch all services with category information
    const services = await prisma.service.findMany({
      where,
      include: {
        category: true,
        subcategory: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get category information for the report
    const categories = await prisma.serviceCategory.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            subcategories: {
              where: {
                services: {
                  some: {},
                },
              },
            },
          },
        },
      },
    });

    // Build preview data for frontend table (simple format)
    const previewData = services.map(service => ({
      id: service.id,
      title: service.title,
      category: (service.category?.name ?? service.subcategory?.category?.name) || 'Uncategorized',
      price: service.price || 0,
      duration: 'N/A', // Services don't have duration field in schema
      status: 'active', // Services don't have status field in schema, defaulting to active
      publishedOnWebsite: service.publishOnWebsite ? 'Yes' : 'No',
      createdAt: new Date(service.createdAt).toLocaleDateString(),
    }));

    // Build detailed report data for PDF/CSV export
    const reportData = {
      summary: {
        totalServices: services.length,
        activeServices: services.length, // All services are considered active since no status field
        publishedServices: services.filter(s => s.publishOnWebsite).length,
        totalCategories: categories.length,
        averagePrice: services.length > 0 ? services.reduce((sum, s) => sum + (s.price || 0), 0) / services.length : 0,
        totalRevenuePotential: services.reduce((sum, s) => sum + (s.price || 0), 0),
      },
      categories: categories.map(cat => ({
        name: cat.name,
        serviceCount: cat._count.subcategories,
      })),
      services: services.map(service => ({
        title: service.title,
        category: (service.category?.name ?? service.subcategory?.category?.name) || 'Uncategorized',
        price: service.price || 0,
        duration: 'N/A', // Services don't have duration field
        status: 'active', // Services don't have status field, defaulting to active
        publishedOnWebsite: service.publishOnWebsite ? 'Yes' : 'No',
        description: service.description || 'N/A',
        features: 'N/A', // Services don't have features field
        createdAt: new Date(service.createdAt).toLocaleDateString(),
        updatedAt: new Date(service.updatedAt).toLocaleDateString(),
      })),
      filters: {
        category: categoryId === 'all' ? 'All Categories' : categories.find(c => c.id === categoryId)?.name || 'Unknown',
        status: status === 'all' ? 'All Statuses' : status || 'All Statuses',
      },
    };

    // PREVIEW - return simple array for table display
    if (!shouldExport) {
      return NextResponse.json({ report: previewData });
    }

    // PDF EXPORT
    if (format === 'pdf') {
      const buffer = generatePDF(reportData);
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=services-report-${Date.now()}.pdf`,
        },
      });
    }

    // CSV EXPORT
    if (format === 'excel') {
      const csv = generateCSV(reportData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=services-report-${Date.now()}.csv`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Export failed: ' + err.message }, { status: 500 });
  }
}

function generatePDF(data: any): Buffer {
  let pdf = '%PDF-1.4\n';
  let content = '';
  let yPos = 750;
  const pageHeight = 792;
  const pageWidth = 612;
  const margin = 40;
  const lineHeight = 14;

  // Helper to add text
  const addText = (text: string, x: number, y: number, fontSize: number, bold: boolean = false) => {
    const font = bold ? 'F2' : 'F1';
    const escapedText = escapeText(text.toString());
    content += `BT\n/${font} ${fontSize} Tf\n${x} ${y} Td\n(${escapedText}) Tj\nET\n`;
  };

  // Helper to draw line
  const drawLine = (x1: number, y: number, x2: number, width: number = 0.5) => {
    content += `q\n${width} w\n${x1} ${y} m\n${x2} ${y} l\nS\nQ\n`;
  };

  // Helper to check if we need new page
  const checkNewPage = () => {
    if (yPos < margin + 50) {
      content += 'Q\nQ\n';
      yPos = pageHeight - margin;
      return true;
    }
    return false;
  };

  // Title Section
  addText('IZOGRUP', margin, yPos, 20, true);
  yPos -= 30;

  addText('Services Catalog Report', margin, yPos, 14, false);
  yPos -= 8;

  addText(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPos, 9, false);
  yPos -= 20;

  drawLine(margin, yPos, pageWidth - margin, 1);
  yPos -= 15;

  // Summary Section
  addText('SUMMARY', margin, yPos, 11, true);
  yPos -= 14;

  const summaryInfo = [
    ['Total Services:', data.summary.totalServices.toString()],
    ['Active Services:', data.summary.activeServices.toString()],
    ['Published Services:', data.summary.publishedServices.toString()],
    ['Total Categories:', data.summary.totalCategories.toString()],
    ['Total Revenue Potential:', `$${data.summary.totalRevenuePotential.toFixed(2)}`],
    ['Average Price:', `$${data.summary.averagePrice.toFixed(2)}`],
  ];

  summaryInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 150, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 10;

  // Filters Section
  addText('FILTERS APPLIED', margin, yPos, 11, true);
  yPos -= 14;

  const filterInfo = [
    ['Category:', data.filters.category],
    ['Status:', data.filters.status],
  ];

  filterInfo.forEach(([label, value]) => {
    addText(label, margin + 10, yPos, 9, true);
    addText(value, margin + 80, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 10;

  // Categories Section
  if (data.categories.length > 0) {
    checkNewPage();
    addText('CATEGORIES', margin, yPos, 11, true);
    yPos -= 14;

    addText('Category Name', margin + 10, yPos, 9, true);
    addText('Service Count', margin + 200, yPos, 9, true);
    yPos -= 12;

    drawLine(margin, yPos, pageWidth - margin, 0.5);
    yPos -= 8;

    data.categories.forEach((category: any) => {
      if (yPos < margin + 30) {
        yPos = pageHeight - margin;
      }

      addText(category.name.substring(0, 30), margin + 10, yPos, 8, false);
      addText(category.serviceCount.toString(), margin + 200, yPos, 8, false);
      yPos -= lineHeight;
    });

    yPos -= 10;
  }

  // Services Section
  if (data.services.length > 0) {
    checkNewPage();
    addText('SERVICES', margin, yPos, 11, true);
    yPos -= 14;

    // Table header
    addText('Title', margin + 10, yPos, 9, true);
    addText('Category', margin + 150, yPos, 9, true);
    addText('Price', margin + 250, yPos, 9, true);
    addText('Duration', margin + 320, yPos, 9, true);
    addText('Status', margin + 400, yPos, 9, true);
    addText('Published', margin + 480, yPos, 9, true);
    yPos -= 12;

    drawLine(margin, yPos, pageWidth - margin, 0.5);
    yPos -= 8;

    // Table rows
    data.services.forEach((service: any) => {
      if (yPos < margin + 30) {
        yPos = pageHeight - margin;
      }

      addText(service.title.substring(0, 20), margin + 10, yPos, 8, false);
      addText(service.category.substring(0, 15), margin + 150, yPos, 8, false);
      addText(`$${service.price}`, margin + 250, yPos, 8, false);
      addText(service.duration.substring(0, 10), margin + 320, yPos, 8, false);
      addText(service.status, margin + 400, yPos, 8, false);
      addText(service.publishedOnWebsite, margin + 480, yPos, 8, false);

      yPos -= lineHeight;
    });
  }

  // Footer
  yPos = 30;
  drawLine(margin, yPos + 10, pageWidth - margin, 0.5);
  addText('Generated by IZOGRUP CRM System', pageWidth / 2 - 80, yPos, 8, false);

  // PDF Objects
  const obj1Start = pdf.length;
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  const obj2Start = pdf.length;
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  const obj3Start = pdf.length;
  pdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`;

  const obj4Start = pdf.length;
  pdf += `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`;

  const obj5Start = pdf.length;
  pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const obj6Start = pdf.length;
  pdf += '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

  const xrefStart = pdf.length;
  pdf += 'xref\n0 7\n';
  pdf += '0000000000 65535 f \n';
  pdf += `${String(obj1Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj2Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj3Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj4Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj5Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj6Start).padStart(10, '0')} 00000 n \n`;

  pdf += 'trailer\n<< /Size 7 /Root 1 0 R >>\n';
  pdf += 'startxref\n';
  pdf += `${xrefStart}\n`;
  pdf += '%%EOF\n';

  return Buffer.from(pdf, 'utf-8');
}

function generateCSV(data: any): string {
  let csv = 'SERVICES CATALOG REPORT\n\n';

  // Summary
  csv += 'SUMMARY\n';
  csv += `Total Services,${data.summary.totalServices}\n`;
  csv += `Active Services,${data.summary.activeServices}\n`;
  csv += `Published Services,${data.summary.publishedServices}\n`;
  csv += `Total Categories,${data.summary.totalCategories}\n`;
  csv += `Total Revenue Potential,$${data.summary.totalRevenuePotential.toFixed(2)}\n`;
  csv += `Average Price,$${data.summary.averagePrice.toFixed(2)}\n\n`;

  // Filters
  csv += 'FILTERS APPLIED\n';
  csv += `Category,${data.filters.category}\n`;
  csv += `Status,${data.filters.status}\n\n`;

  // Categories
  if (data.categories.length > 0) {
    csv += 'CATEGORIES\n';
    csv += 'Category Name,Service Count\n';
    data.categories.forEach((category: any) => {
      csv += `"${category.name}",${category.serviceCount}\n`;
    });
    csv += '\n';
  }

  // Services
  if (data.services.length > 0) {
    csv += 'SERVICES\n';
    csv += 'Title,Category,Price,Duration,Status,Published,Description,Features,Created Date,Updated Date\n';
    data.services.forEach((service: any) => {
      csv += `"${service.title}","${service.category}","${service.price}","${service.duration}","${service.status}","${service.publishedOnWebsite}","${service.description}","${service.features}","${service.createdAt}","${service.updatedAt}"\n`;
    });
  }

  return csv;
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]/g, ' ');
}