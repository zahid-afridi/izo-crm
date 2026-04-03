import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportType, dateFrom, dateTo, filters, format } = body;

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    let reportData: any = {};

    switch (reportType) {
      case 'sales':
        reportData = await generateSalesReport(startDate, endDate, filters);
        break;
      case 'products':
        reportData = await generateProductsReport(startDate, endDate, filters);
        break;
      case 'clients':
        reportData = await generateClientsReport(startDate, endDate, filters);
        break;
      case 'workers':
        reportData = await generateWorkersReport(startDate, endDate, filters);
        break;
      case 'sites':
        reportData = await generateSitesReport(startDate, endDate, filters);
        break;
      case 'inventory':
        reportData = await generateInventoryReport(startDate, endDate, filters);
        break;
      case 'financial':
        reportData = await generateFinancialReport(startDate, endDate, filters);
        break;
      default:
        throw new Error('Invalid report type');
    }

    if (format === 'pdf') {
      const buffer = generatePDF(reportData, reportType);
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=${reportType}-report-${new Date().getTime()}.pdf`,
        },
      });
    } else if (format === 'excel') {
      const csv = generateExcel(reportData, reportType);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=${reportType}-report-${new Date().getTime()}.xlsx`,
        },
      });
    } else if (format === 'csv') {
      const csv = generateCSV(reportData, reportType);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=${reportType}-report-${new Date().getTime()}.csv`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Report generation failed: ' + err.message }, { status: 500 });
  }
}

async function generateSalesReport(startDate: Date, endDate: Date, filters: any) {
  const where: any = {
    orderDate: { gte: startDate, lte: endDate },
  };

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  const orders = await prisma.order.findMany({
    where,
    include: { assignedTo: true },
  });

  const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalOrders = orders.length;
  const approvedOrders = orders.filter(o => o.orderStatus === 'approved').length;
  const rejectedOrders = orders.filter(o => o.orderStatus === 'rejected').length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  return {
    title: 'Sales Report',
    dateRange: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    summary: {
      totalSales,
      totalOrders,
      approvedOrders,
      rejectedOrders,
      avgOrderValue,
    },
    details: orders.map(o => ({
      orderNumber: o.orderNumber,
      client: o.client,
      orderDate: new Date(o.orderDate).toLocaleDateString(),
      status: o.orderStatus,
      totalAmount: o.totalAmount,
      assignedTo: o.assignedTo?.fullName || 'N/A',
    })),
  };
}

async function generateProductsReport(startDate: Date, endDate: Date, filters: any) {
  let where: any = {};
  
  // If a specific category is selected, filter by that category's subcategories
  if (filters.categoryId && filters.categoryId !== 'all') {
    // Get all subcategories for this category
    const subcategories = await prisma.productSubcategory.findMany({
      where: { categoryId: filters.categoryId },
      select: { id: true },
    });
    const subcategoryIds = subcategories.map(s => s.id);
    where.subcategoryId = { in: subcategoryIds };
  }

  const products = await prisma.product.findMany({
    where,
    include: { subcategory: { include: { category: true } } },
  });

  const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

  return {
    title: 'Product Performance Report',
    dateRange: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    summary: {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.status === 'active').length,
      publishedProducts: products.filter(p => p.publishOnWebsite).length,
      totalInventoryValue: totalValue,
    },
    details: products.map(p => ({
      title: p.title,
      sku: p.sku || 'N/A',
      category: p.subcategory?.category?.name || 'N/A',
      subcategory: p.subcategory?.name || 'N/A',
      price: p.price || 0,
      stock: p.stock || 0,
      value: (p.price || 0) * (p.stock || 0),
      status: p.status,
      publishedOnWebsite: p.publishOnWebsite ? 'Yes' : 'No',
    })),
  };
}

async function generateClientsReport(startDate: Date, endDate: Date, filters: any) {
  const where: any = {};
  if (filters.clientId) {
    where.id = filters.clientId;
  }

  const clients = await prisma.client.findMany({ where });
  const orders = await prisma.order.findMany({
    where: { orderDate: { gte: startDate, lte: endDate } },
  });

  const clientsWithStats = clients.map(c => {
    const clientOrders = orders.filter(o => o.clientId === c.id);
    const totalRevenue = clientOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return {
      id: c.id,
      name: c.fullName,
      email: c.email,
      phone: c.phone,
      address: c.address,
      status: c.status,
      totalOrders: clientOrders.length,
      totalRevenue,
    };
  });

  const totalRevenue = clientsWithStats.reduce((sum, c) => sum + c.totalRevenue, 0);

  return {
    title: 'Client Report',
    dateRange: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    summary: {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.status === 'active').length,
      totalRevenue,
    },
    details: clientsWithStats,
  };
}

async function generateWorkersReport(startDate: Date, endDate: Date, filters: any) {
  const where: any = {};
  if (filters.workerId) {
    where.userId = filters.workerId;
  }

  const workers = await prisma.worker.findMany({
    where,
    include: { user: true },
  });

  const assignments = await prisma.assignment.findMany({
    where: { assignedDate: { gte: startDate, lte: endDate } },
  });

  const workersWithStats = workers.map(w => {
    const workerAssignments = assignments.filter(a => a.workerId === w.userId);
    return {
      id: w.id,
      name: w.user?.fullName || 'N/A',
      email: w.user?.email || 'N/A',
      phone: w.user?.phone || 'N/A',
      employeeType: w.employeeType,
      hourlyRate: w.hourlyRate,
      monthlyRate: w.monthlyRate,
      totalAssignments: workerAssignments.length,
      status: w.removeStatus,
    };
  });

  return {
    title: 'Worker Report',
    dateRange: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    summary: {
      totalWorkers: workers.length,
      activeWorkers: workers.filter(w => w.removeStatus === 'active').length,
      totalAssignments: assignments.length,
    },
    details: workersWithStats,
  };
}

async function generateSitesReport(startDate: Date, endDate: Date, filters: any) {
  const where: any = {};
  if (filters.siteStatus && filters.siteStatus !== 'all') {
    where.status = filters.siteStatus;
  }
  if (filters.siteId) {
    where.id = filters.siteId;
  }

  const sites = await prisma.site.findMany({
    where,
    include: { siteManager: true },
  });

  const assignments = await prisma.assignment.findMany({
    where: { assignedDate: { gte: startDate, lte: endDate } },
  });

  const sitesWithStats = sites.map(s => {
    const siteAssignments = assignments.filter(a => a.siteId === s.id);
    return {
      id: s.id,
      name: s.name,
      address: s.address,
      city: s.city,
      status: s.status,
      progress: s.progress,
      startDate: new Date(s.startDate).toLocaleDateString(),
      estimatedEndDate: s.estimatedEndDate ? new Date(s.estimatedEndDate).toLocaleDateString() : 'N/A',
      siteManager: s.siteManager?.fullName || 'N/A',
      totalWorkers: siteAssignments.length,
    };
  });

  return {
    title: 'Construction Sites Report',
    dateRange: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    summary: {
      totalSites: sites.length,
      activeSites: sites.filter(s => s.status === 'active').length,
      completedSites: sites.filter(s => s.status === 'completed').length,
    },
    details: sitesWithStats,
  };
}

async function generateInventoryReport(startDate: Date, endDate: Date, filters: any) {
  const products = await prisma.product.findMany({
    include: { subcategory: true },
  });

  const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

  return {
    title: 'Inventory Report',
    dateRange: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    summary: {
      totalItems: products.length,
      lowStockItems: products.filter(p => (p.stock || 0) < 10).length,
      totalInventoryValue: totalValue,
    },
    details: products.map(p => ({
      title: p.title,
      sku: p.sku,
      category: p.subcategory?.name || 'N/A',
      price: p.price,
      stock: p.stock,
      value: (p.price || 0) * (p.stock || 0),
    })),
  };
}

async function generateFinancialReport(startDate: Date, endDate: Date, filters: any) {
  const orders = await prisma.order.findMany({
    where: { orderDate: { gte: startDate, lte: endDate } },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalDeliveryCost = orders.reduce((sum, o) => sum + (o.deliveryCost || 0), 0);
  const totalDiscount = 0; // Orders don't have discount field yet

  return {
    title: 'Financial Report',
    dateRange: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    summary: {
      totalRevenue,
      totalDiscount,
      totalDeliveryCost,
      netRevenue: totalRevenue - totalDiscount,
    },
    details: orders.map(o => ({
      orderNumber: o.orderNumber,
      orderDate: new Date(o.orderDate).toLocaleDateString(),
      subtotal: o.subtotal,
      discount: 0, // Orders don't have discount field yet
      deliveryCost: o.deliveryCost,
      total: o.totalAmount,
    })),
  };
}

function generatePDF(data: any, reportType: string): Buffer {
  let pdf = '%PDF-1.4\n';
  let content = '';
  let yPos = 750;
  const pageHeight = 792;
  const pageWidth = 612;
  const margin = 40;
  const lineHeight = 12;

  const addText = (text: string, x: number, y: number, fontSize: number, bold: boolean = false) => {
    const font = bold ? 'F2' : 'F1';
    const escapedText = escapeText(text.toString());
    content += `BT\n/${font} ${fontSize} Tf\n${x} ${y} Td\n(${escapedText}) Tj\nET\n`;
  };

  const drawLine = (x1: number, y: number, x2: number, width: number = 0.5) => {
    content += `q\n${width} w\n${x1} ${y} m\n${x2} ${y} l\nS\nQ\n`;
  };

  // Title
  addText('IZOGRUP', margin, yPos, 20, true);
  yPos -= 30;
  addText(data.title, margin, yPos, 14, false);
  yPos -= 8;
  addText(`Report Period: ${data.dateRange}`, margin, yPos, 9, false);
  yPos -= 20;
  drawLine(margin, yPos, pageWidth - margin, 1);
  yPos -= 15;

  // Summary
  addText('SUMMARY', margin, yPos, 11, true);
  yPos -= 14;

  Object.entries(data.summary).forEach(([key, value]: [string, any]) => {
    const label = key.replace(/([A-Z])/g, ' $1').trim();
    addText(`${label}:`, margin + 10, yPos, 9, true);
    const displayValue = typeof value === 'number' ? (value.toFixed(2)) : value.toString();
    addText(displayValue, margin + 150, yPos, 9, false);
    yPos -= lineHeight;
  });

  yPos -= 10;

  // Details table
  if (data.details && data.details.length > 0) {
    addText('DETAILS', margin, yPos, 11, true);
    yPos -= 14;

    const firstItem = data.details[0];
    const columns = Object.keys(firstItem);
    const colWidth = (pageWidth - 2 * margin) / columns.length;

    columns.forEach((col, idx) => {
      addText(col.substring(0, 12), margin + idx * colWidth + 5, yPos, 8, true);
    });
    yPos -= 12;
    drawLine(margin, yPos, pageWidth - margin, 0.5);
    yPos -= 8;

    data.details.slice(0, 20).forEach((item: any) => {
      if (yPos < margin + 30) yPos = pageHeight - margin;
      columns.forEach((col, idx) => {
        const val = item[col];
        const displayVal = typeof val === 'number' ? val.toFixed(2) : (val || 'N/A').toString().substring(0, 15);
        addText(displayVal, margin + idx * colWidth + 5, yPos, 7, false);
      });
      yPos -= lineHeight;
    });
  }

  // Footer
  yPos = 30;
  drawLine(margin, yPos + 10, pageWidth - margin, 0.5);
  addText('Generated by IZOGRUP CRM System', pageWidth / 2 - 80, yPos, 8, false);

  // PDF structure
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
  pdf += 'xref\n0 7\n0000000000 65535 f \n';
  pdf += `${String(obj1Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj2Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj3Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj4Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj5Start).padStart(10, '0')} 00000 n \n`;
  pdf += `${String(obj6Start).padStart(10, '0')} 00000 n \n`;

  pdf += 'trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n';
  pdf += `${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf-8');
}

function generateExcel(data: any, reportType: string): string {
  return generateCSV(data, reportType);
}

function generateCSV(data: any, reportType: string): string {
  let csv = `${data.title}\n`;
  csv += `Report Period: ${data.dateRange}\n\n`;

  csv += 'SUMMARY\n';
  Object.entries(data.summary).forEach(([key, value]: [string, any]) => {
    const label = key.replace(/([A-Z])/g, ' $1').trim();
    csv += `${label},${typeof value === 'number' ? value.toFixed(2) : value}\n`;
  });

  if (data.details && data.details.length > 0) {
    csv += '\nDETAILS\n';
    const columns = Object.keys(data.details[0]);
    csv += columns.join(',') + '\n';
    data.details.forEach((item: any) => {
      csv += columns.map(col => {
        const val = item[col];
        return typeof val === 'number' ? val.toFixed(2) : `"${val || ''}"`;
      }).join(',') + '\n';
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
