import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;

    // Fetch offer with related data
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Generate PDF using pdf-lib
    const pdfBuffer = await generateOfferPDF(offer);
    
    // Ensure we have a valid filename
    const filename = offer.offerNumber ? `${offer.offerNumber}.pdf` : `offer-${offerId}.pdf`;
    
    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error downloading offer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateOfferPDF(offer: any): Promise<Buffer> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Page dimensions
    const pageWidth = 842; // A4 Landscape
    const pageHeight = 595;
    
    // Colors matching the image
    const darkBlue = rgb(0.1, 0.2, 0.4);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const borderColor = rgb(0, 0, 0);
    const headerBg = rgb(0.9, 0.9, 0.9);
    
    // Currency symbol
    const currencySymbol = offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : 'Lek ';
    
    // Table configuration
    const rowHeight = 18;
    const colWidths = [30, 200, 60, 50, 70, 70, 70, 70, 70, 70];
    const headers = ['No.', 'DESCRIPTION', 'UNIT', 'QTY', `UNIT PRICE\n(${currencySymbol})`, 'TOTAL\nCONTRACT', 'ACTUAL\nCOMPLETED', 'PROGRESS\nCOMPLETED', 'VALUE\nCONTRACT', 'VALUE\nACTUAL'];
    
    // Calculate available space for table rows
    const headerHeight = 200; // Space for header, title, project details
    const footerHeight = 200; // Space for totals, signatures
    const availableHeight = pageHeight - headerHeight - footerHeight;
    const maxRowsPerPage = Math.floor(availableHeight / rowHeight) - 1; // -1 for table header
    
    // Split items into pages
    const items = offer.items || [];
    const totalPages = Math.ceil(items.length / maxRowsPerPage) || 1;
    
    // Helper functions
    const drawText = (page: any, text: string, x: number, y: number, options: any = {}) => {
      page.drawText(text || '', {
        x,
        y,
        size: options.size || 9,
        font: options.bold ? helveticaBoldFont : helveticaFont,
        color: options.color || rgb(0, 0, 0),
        maxWidth: options.maxWidth || 200,
      });
    };
    
    const drawBorderedRect = (page: any, x: number, y: number, w: number, h: number, fillColor?: any, borderWidth = 0.5) => {
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
    
    const drawPageHeader = (page: any, pageNumber: number) => {
      let yPosition = pageHeight - 40;
      
      // Main border around entire document
      drawBorderedRect(page, 30, 30, pageWidth - 60, pageHeight - 60, undefined, 2);
      
      // Header section with logo area and date
      const headerY = pageHeight - 80;
      
      // Logo area (left side)
      drawBorderedRect(page, 40, headerY - 40, 300, 40, lightGray);
      drawText(page, 'IZOGRUP', 50, headerY - 15, { size: 16, bold: true, color: darkBlue });
      drawText(page, 'CONSTRUCTION - ENGINEERING - CONSULTING', 50, headerY - 30, { size: 8, color: darkBlue });
      
      // Date area (right side)
      drawBorderedRect(page, pageWidth - 180, headerY - 40, 140, 40, lightGray);
      drawText(page, `Date: ${new Date().toLocaleDateString()}`, pageWidth - 170, headerY - 25, { size: 9, bold: true });
      
      // Page number (if multiple pages)
      if (totalPages > 1) {
        drawText(page, `Page ${pageNumber} of ${totalPages}`, pageWidth - 170, headerY - 35, { size: 8 });
      }
      
      yPosition = headerY - 60;
      
      // Title section
      drawBorderedRect(page, 40, yPosition - 25, pageWidth - 80, 25, headerBg);
      drawText(page, 'WORK SITUATION', pageWidth/2 - 50, yPosition - 15, { size: 12, bold: true });
      
      yPosition -= 45;
      
      // Project details section (only on first page)
      if (pageNumber === 1) {
        drawBorderedRect(page, 40, yPosition - 20, pageWidth - 80, 20, lightGray);
        drawText(page, `PROJECT: ${offer.title || 'Construction Project'}`, 50, yPosition - 12, { size: 9, bold: true });
        
        yPosition -= 25;
        
        // Contract details section
        drawBorderedRect(page, 40, yPosition - 40, pageWidth - 80, 40, undefined);
        
        // Left column
        drawText(page, 'CLIENT:', 50, yPosition - 12, { size: 9, bold: true });
        drawText(page, 'CONTRACTOR:', 50, yPosition - 25, { size: 9, bold: true });
        drawText(page, 'SUBCONTRACTOR:', 50, yPosition - 38, { size: 9, bold: true });
        
        // Middle column
        drawText(page, 'WORK TYPE:', 250, yPosition - 12, { size: 9, bold: true });
        drawText(page, 'IZOGRUP Ltd.', 250, yPosition - 25, { size: 9 });
        
        // Right column
        drawText(page, 'Unit:', 450, yPosition - 12, { size: 9, bold: true });
        drawText(page, `Contract No: ${offer.offerNumber}`, 450, yPosition - 25, { size: 9 });
        drawText(page, 'Location:', 450, yPosition - 38, { size: 9 });
        
        // Values
        drawText(page, offer.client || 'Client Name', 120, yPosition - 12, { size: 9 });
        drawText(page, 'Construction', 320, yPosition - 12, { size: 9 });
        drawText(page, 'Various', 480, yPosition - 12, { size: 9 });
        drawText(page, 'Project Site', 500, yPosition - 38, { size: 9 });
        
        yPosition -= 60;
      } else {
        // For continuation pages, add a smaller project reference
        drawBorderedRect(page, 40, yPosition - 20, pageWidth - 80, 20, lightGray);
        drawText(page, `PROJECT: ${offer.title || 'Construction Project'} (Continued)`, 50, yPosition - 12, { size: 9, bold: true });
        yPosition -= 40;
      }
      
      return yPosition;
    };
    
    const drawTableHeader = (page: any, yPosition: number) => {
      // Draw table header background
      drawBorderedRect(page, 40, yPosition - rowHeight, pageWidth - 80, rowHeight, headerBg);
      
      // Table headers
      let currentX = 40;
      headers.forEach((header, i) => {
        drawBorderedRect(page, currentX, yPosition - rowHeight, colWidths[i], rowHeight);
        const lines = header.split('\n');
        if (lines.length > 1) {
          drawText(page, lines[0], currentX + 2, yPosition - 8, { size: 7, bold: true });
          drawText(page, lines[1], currentX + 2, yPosition - 16, { size: 7, bold: true });
        } else {
          drawText(page, header, currentX + 2, yPosition - 12, { size: 7, bold: true });
        }
        currentX += colWidths[i];
      });
      
      return yPosition - rowHeight;
    };
    
    const drawTableRow = (page: any, item: any, index: number, yPosition: number, globalIndex: number) => {
      let currentX = 40;
      
      // Row background (alternating)
      if (globalIndex % 2 === 0) {
        drawBorderedRect(page, 40, yPosition, pageWidth - 80, rowHeight, rgb(0.98, 0.98, 0.98));
      }
      
      const rowData = [
        (globalIndex + 1).toString(),
        item.name || 'Item Description',
        item.type === 'product' ? 'pcs' : item.type === 'service' ? 'hrs' : 'm²',
        (item.quantity || 0).toString(),
        `${currencySymbol}${(item.unitPrice || 0).toFixed(2)}`,
        `${currencySymbol}${(item.total || 0).toFixed(2)}`,
        `${currencySymbol}${(item.total || 0).toFixed(2)}`,
        '100%',
        `${currencySymbol}${(item.total || 0).toFixed(2)}`,
        `${currencySymbol}${(item.total || 0).toFixed(2)}`
      ];
      
      rowData.forEach((data, i) => {
        drawBorderedRect(page, currentX, yPosition, colWidths[i], rowHeight);
        const textX = i === 0 ? currentX + colWidths[i]/2 - 5 : currentX + 2;
        drawText(page, data, textX, yPosition + 6, { size: 8 });
        currentX += colWidths[i];
      });
      
      return yPosition - rowHeight;
    };
    
    const drawSummarySection = (page: any, yPosition: number) => {
      const subtotal = offer.subtotal || 0;
      const total = offer.totalAmount || 0;
      
      // TOTAL row
      let currentX = 40;
      drawBorderedRect(page, currentX, yPosition, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight, headerBg);
      drawText(page, 'TOTAL', currentX + 10, yPosition + 6, { size: 9, bold: true });
      currentX += colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
      
      const totalData = [
        `${currencySymbol}${subtotal.toFixed(2)}`,
        `${currencySymbol}${total.toFixed(2)}`,
        `${currencySymbol}${total.toFixed(2)}`,
        '100%',
        `${currencySymbol}${total.toFixed(2)}`,
        `${currencySymbol}${total.toFixed(2)}`
      ];
      
      for (let i = 4; i < colWidths.length; i++) {
        drawBorderedRect(page, currentX, yPosition, colWidths[i], rowHeight, headerBg);
        drawText(page, totalData[i - 4], currentX + 2, yPosition + 6, { size: 8, bold: true });
        currentX += colWidths[i];
      }
      
      yPosition -= rowHeight;
      
      // Tax rows
      currentX = 40 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];
      
      // Total without VAT
      drawBorderedRect(page, currentX, yPosition, colWidths[6], rowHeight, lightGray);
      drawText(page, 'Total without VAT', currentX + 2, yPosition + 6, { size: 7, bold: true });
      currentX += colWidths[6];
      
      drawBorderedRect(page, currentX, yPosition, colWidths[7], rowHeight);
      drawText(page, `${currencySymbol}0.00`, currentX + 2, yPosition + 6, { size: 8 });
      currentX += colWidths[7];
      
      drawBorderedRect(page, currentX, yPosition, colWidths[8], rowHeight);
      drawText(page, `${currencySymbol}${total.toFixed(2)}`, currentX + 2, yPosition + 6, { size: 8, bold: true });
      currentX += colWidths[8];
      
      drawBorderedRect(page, currentX, yPosition, colWidths[9], rowHeight);
      drawText(page, `${currencySymbol}${total.toFixed(2)}`, currentX + 2, yPosition + 6, { size: 8, bold: true });
      
      // VAT 20% row
      yPosition -= rowHeight;
      currentX = 40 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];
      
      drawBorderedRect(page, currentX, yPosition, colWidths[6], rowHeight, lightGray);
      drawText(page, 'VAT 20%', currentX + 2, yPosition + 6, { size: 7, bold: true });
      currentX += colWidths[6];
      
      drawBorderedRect(page, currentX, yPosition, colWidths[7], rowHeight);
      drawText(page, `${currencySymbol}0.00`, currentX + 2, yPosition + 6, { size: 8 });
      currentX += colWidths[7];
      
      drawBorderedRect(page, currentX, yPosition, colWidths[8], rowHeight);
      drawText(page, `${currencySymbol}0.00`, currentX + 2, yPosition + 6, { size: 8, bold: true });
      currentX += colWidths[8];
      
      drawBorderedRect(page, currentX, yPosition, colWidths[9], rowHeight);
      drawText(page, `${currencySymbol}0.00`, currentX + 2, yPosition + 6, { size: 8, bold: true });
      
      // Total with VAT row
      yPosition -= rowHeight;
      currentX = 40 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];
      
      drawBorderedRect(page, currentX, yPosition, colWidths[6], rowHeight, lightGray);
      drawText(page, 'Total with VAT', currentX + 2, yPosition + 6, { size: 7, bold: true });
      currentX += colWidths[6];
      
      drawBorderedRect(page, currentX, yPosition, colWidths[7], rowHeight);
      drawText(page, `${currencySymbol}0.00`, currentX + 2, yPosition + 6, { size: 8 });
      currentX += colWidths[7];
      
      drawBorderedRect(page, currentX, yPosition, colWidths[8], rowHeight, rgb(1, 1, 0.8));
      drawText(page, `${currencySymbol}${total.toFixed(2)}`, currentX + 2, yPosition + 6, { size: 8, bold: true });
      currentX += colWidths[8];
      
      drawBorderedRect(page, currentX, yPosition, colWidths[9], rowHeight, rgb(1, 1, 0.8));
      drawText(page, `${currencySymbol}${total.toFixed(2)}`, currentX + 2, yPosition + 6, { size: 8, bold: true });
      
      return yPosition - 40;
    };
    
    const drawSignatureSection = (page: any, yPosition: number) => {
      // Subcontractor section (left)
      drawBorderedRect(page, 40, yPosition - 60, 300, 20, lightGray);
      drawText(page, 'SUBCONTRACTOR', 50, yPosition - 50, { size: 9, bold: true });
      
      drawBorderedRect(page, 40, yPosition - 80, 300, 20);
      drawText(page, 'Administrator', 50, yPosition - 70, { size: 9 });
      
      drawBorderedRect(page, 40, yPosition - 100, 300, 20);
      drawText(page, 'Project Manager', 50, yPosition - 90, { size: 9 });
      
      // Contractor section (right)
      drawBorderedRect(page, pageWidth - 340, yPosition - 60, 300, 20, lightGray);
      drawText(page, 'CONTRACTOR', pageWidth - 330, yPosition - 50, { size: 9, bold: true });
      
      drawBorderedRect(page, pageWidth - 340, yPosition - 80, 300, 20);
      drawText(page, 'Administrator', pageWidth - 330, yPosition - 70, { size: 9 });
      
      drawBorderedRect(page, pageWidth - 340, yPosition - 100, 300, 20);
      drawText(page, 'Site Manager', pageWidth - 330, yPosition - 90, { size: 9 });
    };
    
    // Generate pages
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      // Draw page header
      let yPosition = drawPageHeader(page, pageNum);
      
      // Draw table header
      yPosition = drawTableHeader(page, yPosition);
      
      // Calculate items for this page
      const startIndex = (pageNum - 1) * maxRowsPerPage;
      const endIndex = Math.min(startIndex + maxRowsPerPage, items.length);
      const pageItems = items.slice(startIndex, endIndex);
      
      // Draw table rows
      pageItems.forEach((item: any, localIndex: number) => {
        const globalIndex = startIndex + localIndex;
        yPosition = drawTableRow(page, item, localIndex, yPosition, globalIndex);
      });
      
      // Fill remaining rows with empty cells (only if there are fewer items than max rows)
      const remainingRows = maxRowsPerPage - pageItems.length;
      for (let i = 0; i < remainingRows; i++) {
        let currentX = 40;
        colWidths.forEach((width) => {
          drawBorderedRect(page, currentX, yPosition, width, rowHeight);
          currentX += width;
        });
        yPosition -= rowHeight;
      }
      
      // Draw summary section only on the last page
      if (pageNum === totalPages) {
        yPosition = drawSummarySection(page, yPosition);
        drawSignatureSection(page, yPosition);
      }
    }
    
    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}