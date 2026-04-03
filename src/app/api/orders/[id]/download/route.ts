import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Fetch order with related data including client information
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch client information if clientId exists
    let clientInfo = null;
    if (order.clientId) {
      clientInfo = await prisma.client.findUnique({
        where: { id: order.clientId },
      });
    }

    // Fetch company information for invoice header
    const companyInfo = await prisma.companyInfo.findFirst();

    // Generate PDF using pdf-lib
    const pdfBuffer = await generateOrderInvoicePDF(order, clientInfo, companyInfo);
    
    // Ensure we have a valid filename
    const filename = order.orderNumber ? `${order.orderNumber}-invoice.pdf` : `order-${orderId}-invoice.pdf`;
    
    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error downloading order invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateOrderInvoicePDF(order: any, clientInfo: any, companyInfo: any): Promise<Buffer> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add a page
    let page = pdfDoc.addPage([595, 842]); // A4 Portrait
    const { width, height } = page.getSize();
    let yPosition = height - 40;
    
    // Simple colors matching offers design
    const darkBlue = rgb(0.1, 0.2, 0.4);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const headerBg = rgb(0.9, 0.9, 0.9);
    const borderColor = rgb(0, 0, 0);
    
    // Helper function to draw text
    const drawText = (text: string, x: number, y: number, options: any = {}) => {
      page.drawText(text || '', {
        x,
        y,
        size: options.size || 9,
        font: options.bold ? helveticaBoldFont : helveticaFont,
        color: options.color || rgb(0, 0, 0),
        maxWidth: options.maxWidth || 200,
      });
    };
    
    // Helper function to draw bordered rectangle
    const drawBorderedRect = (x: number, y: number, w: number, h: number, fillColor?: any, borderWidth = 0.5) => {
      if (fillColor) {
        page.drawRectangle({
          x, y, width: w, height: h,
          color: fillColor,
        });
      }
      page.drawRectangle({
        x, y, width: w, height: h,
        borderColor: borderColor,
        borderWidth: borderWidth,
      });
    };
    
    // Main border around entire document
    drawBorderedRect(30, 30, width - 60, height - 60, undefined, 2);
    
    // Header section with logo area and invoice details
    const headerY = height - 80;
    
    // Logo area (left side)
    drawBorderedRect(40, headerY - 40, 300, 40, lightGray);
    drawText('IZOGRUP', 50, headerY - 15, { size: 16, bold: true, color: darkBlue });
    drawText('CONSTRUCTION - ENGINEERING - CONSULTING', 50, headerY - 30, { size: 8, color: darkBlue });
    
    // Invoice details area (right side)
    drawBorderedRect(width - 180, headerY - 40, 140, 40, lightGray);
    drawText('INVOICE', width - 170, headerY - 15, { size: 14, bold: true });
    drawText(`#${order.orderNumber}`, width - 170, headerY - 30, { size: 10, bold: true });
    
    yPosition = headerY - 60;
    
    // Invoice details section
    drawBorderedRect(40, yPosition - 80, width - 80, 20, headerBg);
    drawText('INVOICE DETAILS', width/2 - 40, yPosition - 70, { size: 12, bold: true });
    
    yPosition -= 25;
    
    // Invoice information
    drawBorderedRect(40, yPosition - 55, width - 80, 55, undefined);
    
    // Left column
    drawText('Invoice Date:', 50, yPosition - 15, { size: 9, bold: true });
    drawText('Due Date:', 50, yPosition - 30, { size: 9, bold: true });
    drawText('Status:', 50, yPosition - 45, { size: 9, bold: true });
    
    // Right column values
    drawText(new Date(order.orderDate).toLocaleDateString(), 150, yPosition - 15, { size: 9 });
    drawText(order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'N/A', 150, yPosition - 30, { size: 9 });
    drawText(order.orderStatus.toUpperCase(), 150, yPosition - 45, { size: 9, color: darkBlue });
    
    // Middle column
    drawText('Payment Status:', 300, yPosition - 15, { size: 9, bold: true });
    drawText('Payment Method:', 300, yPosition - 30, { size: 9, bold: true });
    if (order.assignedTo?.fullName) {
      drawText('Processed By:', 300, yPosition - 45, { size: 9, bold: true });
    }
    
    // Middle column values
    drawText(order.paymentStatus.toUpperCase(), 400, yPosition - 15, { size: 9, color: order.paymentStatus === 'paid' ? rgb(0, 0.6, 0) : rgb(0.8, 0.4, 0) });
    drawText(order.paymentMethod || 'N/A', 400, yPosition - 30, { size: 9 });
    if (order.assignedTo?.fullName) {
      drawText(order.assignedTo.fullName, 400, yPosition - 45, { size: 9 });
    }
    
    yPosition -= 75;
    
    // Client information section
    drawBorderedRect(40, yPosition - 20, width - 80, 20, headerBg);
    drawText('BILL TO:', 50, yPosition - 12, { size: 10, bold: true });
    
    yPosition -= 25;
    
    // Client details
    const clientHeight = 80;
    drawBorderedRect(40, yPosition - clientHeight, width - 80, clientHeight, undefined);
    
    const clientName = clientInfo?.fullName || order.client || 'Client Name';
    drawText(clientName, 50, yPosition - 15, { size: 11, bold: true });
    
    let clientY = yPosition - 30;
    if (clientInfo?.email) {
      drawText(`Email: ${clientInfo.email}`, 50, clientY, { size: 9 });
      clientY -= 15;
    }
    
    if (clientInfo?.phone) {
      drawText(`Phone: ${clientInfo.phone}`, 50, clientY, { size: 9 });
      clientY -= 15;
    }
    
    if (clientInfo?.address) {
      drawText(`Address: ${clientInfo.address}`, 50, clientY, { size: 9, maxWidth: 250 });
    }
    
    // Delivery address (right side if different)
    if (order.deliveryAddress && order.deliveryAddress !== clientInfo?.address) {
      drawText('DELIVERY ADDRESS:', 300, yPosition - 15, { size: 9, bold: true });
      const deliveryLines = order.deliveryAddress.split('\n').slice(0, 3);
      deliveryLines.forEach((line: string, index: number) => {
        drawText(line, 300, yPosition - 30 - (index * 12), { size: 9, maxWidth: 240 });
      });
    }
    
    yPosition -= clientHeight + 20;
    
    // Order information section
    if (order.orderTitle || order.deliveryInstructions) {
      drawBorderedRect(40, yPosition - 20, width - 80, 20, headerBg);
      drawText('ORDER INFORMATION:', 50, yPosition - 12, { size: 10, bold: true });
      
      yPosition -= 25;
      
      const orderInfoHeight = 40;
      drawBorderedRect(40, yPosition - orderInfoHeight, width - 80, orderInfoHeight, undefined);
      
      if (order.orderTitle) {
        drawText(`Order Title: ${order.orderTitle}`, 50, yPosition - 15, { size: 9, bold: true, maxWidth: 480 });
      }
      
      if (order.deliveryInstructions) {
        drawText(`Delivery Instructions: ${order.deliveryInstructions}`, 50, yPosition - 30, { size: 9, maxWidth: 480 });
      }
      
      yPosition -= orderInfoHeight + 20;
    }
    
    // Items table header
    drawBorderedRect(40, yPosition - 20, width - 80, 20, headerBg);
    drawText('ORDER ITEMS:', 50, yPosition - 12, { size: 10, bold: true });
    
    yPosition -= 25;
    
    // Table setup
    const tableStartY = yPosition;
    const rowHeight = 20;
    const colWidths = [40, 200, 60, 60, 80, 90]; // No., Description, Type, Qty, Unit Price, Total
    let currentX = 40;
    
    // Table header
    drawBorderedRect(40, tableStartY - rowHeight, width - 80, rowHeight, headerBg);
    
    const headers = ['No.', 'DESCRIPTION', 'TYPE', 'QTY', 'UNIT PRICE', 'TOTAL'];
    currentX = 40;
    headers.forEach((header, i) => {
      drawBorderedRect(currentX, tableStartY - rowHeight, colWidths[i], rowHeight);
      drawText(header, currentX + 5, tableStartY - 12, { size: 8, bold: true });
      currentX += colWidths[i];
    });
    
    yPosition = tableStartY - rowHeight;
    
    // Table rows with order items
    if (order.items && order.items.length > 0) {
      order.items.forEach((item: any, index: number) => {
        yPosition -= rowHeight;
        currentX = 40;
        
        // Row background (alternating)
        if (index % 2 === 0) {
          drawBorderedRect(40, yPosition, width - 80, rowHeight, rgb(0.98, 0.98, 0.98));
        }
        
        const itemType = item.type === 'product' ? 'Product' : 
                        item.type === 'service' ? 'Service' : 
                        item.type === 'package' ? 'Package' : 'Item';
        
        const rowData = [
          (index + 1).toString(),
          item.name || 'Item Description',
          itemType,
          (item.quantity || 0).toString(),
          `€${(item.unitPrice || 0).toFixed(2)}`,
          `€${(item.total || 0).toFixed(2)}`
        ];
        
        rowData.forEach((data, i) => {
          drawBorderedRect(currentX, yPosition, colWidths[i], rowHeight);
          const textX = i === 0 ? currentX + colWidths[i]/2 - 5 : currentX + 5;
          drawText(data, textX, yPosition + 6, { size: 8, maxWidth: colWidths[i] - 10 });
          currentX += colWidths[i];
        });
        
        // Check if we need a new page
        if (yPosition < 200) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = height - 60;
        }
      });
    } else {
      // No items message
      yPosition -= rowHeight;
      drawBorderedRect(40, yPosition, width - 80, rowHeight, lightGray);
      drawText('No items found in this order', 50, yPosition + 6, { size: 9 });
    }
    
    // Add some empty rows for consistency
    const minRows = Math.max(5, (order.items?.length || 0));
    const currentRows = order.items?.length || 0;
    for (let i = currentRows; i < minRows; i++) {
      yPosition -= rowHeight;
      currentX = 40;
      colWidths.forEach((width) => {
        drawBorderedRect(currentX, yPosition, width, rowHeight);
        currentX += width;
      });
    }
    
    yPosition -= 30;
    
    // Summary section
    const summaryStartX = width - 250;
    
    // Summary header
    drawBorderedRect(summaryStartX, yPosition - 20, 210, 20, headerBg);
    drawText('ORDER SUMMARY', summaryStartX + 10, yPosition - 12, { size: 10, bold: true });
    
    yPosition -= 25;
    
    // Summary rows
    const summaryItems = [
      ['Subtotal:', `€${(order.subtotal || 0).toFixed(2)}`],
    ];
    
    summaryItems.push(['Tax (20%):', `€${(order.tax || 0).toFixed(2)}`]);
    
    if (order.deliveryCost > 0) {
      summaryItems.push(['Delivery Cost:', `€${(order.deliveryCost || 0).toFixed(2)}`]);
    }
    
    // Regular summary items
    summaryItems.forEach((item) => {
      yPosition -= 18;
      drawBorderedRect(summaryStartX, yPosition, 140, 18);
      drawBorderedRect(summaryStartX + 140, yPosition, 70, 18);
      
      drawText(item[0], summaryStartX + 5, yPosition + 6, { size: 9 });
      drawText(item[1], summaryStartX + 145, yPosition + 6, { size: 9 });
    });
    
    // Total row with highlight
    yPosition -= 18;
    drawBorderedRect(summaryStartX, yPosition, 140, 18, rgb(1, 1, 0.8)); // Light yellow
    drawBorderedRect(summaryStartX + 140, yPosition, 70, 18, rgb(1, 1, 0.8)); // Light yellow
    
    drawText('TOTAL AMOUNT:', summaryStartX + 5, yPosition + 6, { size: 10, bold: true });
    drawText(`€${(order.totalAmount || 0).toFixed(2)}`, summaryStartX + 145, yPosition + 6, { size: 10, bold: true });
    
    yPosition -= 40;
    
    // Notes section
    if (order.notes) {
      drawBorderedRect(40, yPosition - 20, width - 80, 20, headerBg);
      drawText('ADDITIONAL NOTES:', 50, yPosition - 12, { size: 10, bold: true });
      
      yPosition -= 25;
      
      const notesHeight = 60;
      drawBorderedRect(40, yPosition - notesHeight, width - 80, notesHeight, undefined);
      
      const noteLines = order.notes.split('\n').slice(0, 4); // Limit to 4 lines
      noteLines.forEach((line: string, index: number) => {
        drawText(line, 50, yPosition - 15 - (index * 12), { size: 9, maxWidth: width - 120 });
      });
      
      yPosition -= notesHeight + 20;
    }
    
    // Footer section
    yPosition = 120;
    
    // Company information footer
    drawBorderedRect(40, yPosition - 60, width - 80, 20, lightGray);
    drawText('IZOGRUP - Construction Management System', 50, yPosition - 50, { size: 10, bold: true });
    
    drawBorderedRect(40, yPosition - 80, width - 80, 20);
    let footerText = 'Thank you for your business!';
    if (companyInfo?.phone || companyInfo?.email) {
      const contactInfo = [companyInfo?.phone, companyInfo?.email].filter(Boolean).join(' | ');
      footerText += ` Contact: ${contactInfo}`;
    }
    drawText(footerText, 50, yPosition - 70, { size: 9, maxWidth: width - 120 });
    
    // Generation info
    drawText(`Generated on: ${new Date().toLocaleString()}`, 50, yPosition - 95, { size: 8, color: rgb(0.5, 0.5, 0.5) });
    drawText(`Invoice ID: ${order.id}`, width - 200, yPosition - 95, { size: 8, color: rgb(0.5, 0.5, 0.5) });
    
    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}