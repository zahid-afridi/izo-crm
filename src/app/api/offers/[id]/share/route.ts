import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/S3';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Helper function to extract S3 key from URL
function extractS3Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let key = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    
    if (key.startsWith('izogrup-ontop/')) {
      key = key.slice('izogrup-ontop/'.length);
    }
    
    return key;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', url, error);
    return null;
  }
}

export async function POST(
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

    // Check if we already have a shared version that's still valid
    const existingShared = await prisma.sharedOffer.findFirst({
      where: {
        offerId: offerId,
        OR: [
          { expiresAt: null }, // Never expires
          { expiresAt: { gt: new Date() } } // Not yet expired
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingShared) {
      // Return existing shared URL
      return NextResponse.json({
        success: true,
        url: existingShared.cloudinaryUrl,
        public_id: existingShared.cloudinaryPublicId,
        filename: existingShared.filename,
        isExisting: true
      });
    }

    // Generate PDF using the same function as download
    const pdfBuffer = await generateOfferPDF(offer);
    
    // Upload PDF to Digital Ocean Spaces
    const filename = offer.offerNumber ? `${offer.offerNumber}.pdf` : `offer-${offerId}.pdf`;
    
    // Convert buffer to base64 for S3 upload
    const base64PDF = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    const uploadResult = await uploadFile(base64PDF, 'izo/offers');
    
    // Save shared offer record
    const sharedOffer = await prisma.sharedOffer.create({
      data: {
        offerId: offerId,
        filename: filename,
        cloudinaryUrl: uploadResult.url,
        cloudinaryPublicId: extractS3Key(uploadResult.url) || '',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }
    });
    
    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      public_id: extractS3Key(uploadResult.url),
      filename: filename,
      sharedId: sharedOffer.id,
      expiresAt: sharedOffer.expiresAt
    });

  } catch (error) {
    console.error('Error sharing offer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Copy the PDF generation function from download route
async function generateOfferPDF(offer: any): Promise<Buffer> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add a page
    let page = pdfDoc.addPage([842, 595]); // A4 Landscape
    const { width, height } = page.getSize();
    let yPosition = height - 40;
    
    // Colors matching the image
    const darkBlue = rgb(0.1, 0.2, 0.4); // Dark blue for header
    const lightGray = rgb(0.95, 0.95, 0.95);
    const borderColor = rgb(0, 0, 0);
    const headerBg = rgb(0.9, 0.9, 0.9);
    
    // Currency symbol
    const currencySymbol = offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : 'Lek ';
    
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
    
    // Header section with logo area and date
    const headerY = height - 80;
    
    // Logo area (left side)
    drawBorderedRect(40, headerY - 40, 300, 40, lightGray);
    drawText('IZOGRUP', 50, headerY - 15, { size: 16, bold: true, color: darkBlue });
    drawText('CONSTRUCTION - ENGINEERING - CONSULTING', 50, headerY - 30, { size: 8, color: darkBlue });
    
    // Date area (right side)
    drawBorderedRect(width - 180, headerY - 40, 140, 40, lightGray);
    drawText(`Date: ${new Date().toLocaleDateString()}`, width - 170, headerY - 25, { size: 9, bold: true });
    
    yPosition = headerY - 60;
    
    // Title section
    drawBorderedRect(40, yPosition - 25, width - 80, 25, headerBg);
    drawText('WORK SITUATION', width/2 - 50, yPosition - 15, { size: 12, bold: true });
    
    yPosition -= 45;
    
    // Project details section
    drawBorderedRect(40, yPosition - 20, width - 80, 20, lightGray);
    drawText(`PROJECT: ${offer.title || 'Construction Project'}`, 50, yPosition - 12, { size: 9, bold: true });
    
    yPosition -= 25;
    
    // Contract details section
    drawBorderedRect(40, yPosition - 40, width - 80, 40, undefined);
    
    // Left column
    drawText('CLIENT:', 50, yPosition - 12, { size: 9, bold: true });
    drawText('CONTRACTOR:', 50, yPosition - 25, { size: 9, bold: true });
    drawText('SUBCONTRACTOR:', 50, yPosition - 38, { size: 9, bold: true });
    
    // Middle column
    drawText('WORK TYPE:', 250, yPosition - 12, { size: 9, bold: true });
    drawText('IZOGRUP Ltd.', 250, yPosition - 25, { size: 9 });
    
    // Right column
    drawText('Unit:', 450, yPosition - 12, { size: 9, bold: true });
    drawText(`Contract No: ${offer.offerNumber}`, 450, yPosition - 25, { size: 9 });
    drawText('Location:', 450, yPosition - 38, { size: 9 });
    
    // Values
    drawText(offer.client || 'Client Name', 120, yPosition - 12, { size: 9 });
    drawText('Construction', 320, yPosition - 12, { size: 9 });
    drawText('Various', 480, yPosition - 12, { size: 9 });
    drawText('Project Site', 500, yPosition - 38, { size: 9 });
    
    yPosition -= 60;
    
    // Table header
    const tableStartY = yPosition;
    const rowHeight = 18;
    const colWidths = [30, 200, 60, 50, 70, 70, 70, 70, 70, 70]; // Column widths
    let currentX = 40;
    
    // Draw table header background
    drawBorderedRect(40, tableStartY - rowHeight, width - 80, rowHeight, headerBg);
    
    // Table headers
    const headers = ['No.', 'DESCRIPTION', 'UNIT', 'QTY', 'UNIT PRICE\n(Euro)', 'TOTAL\nCONTRACT', 'ACTUAL\nCOMPLETED', 'PROGRESS\nCOMPLETED', 'VALUE\nCONTRACT', 'VALUE\nACTUAL'];
    
    currentX = 40;
    headers.forEach((header, i) => {
      drawBorderedRect(currentX, tableStartY - rowHeight, colWidths[i], rowHeight);
      const lines = header.split('\n');
      if (lines.length > 1) {
        drawText(lines[0], currentX + 2, tableStartY - 8, { size: 7, bold: true });
        drawText(lines[1], currentX + 2, tableStartY - 16, { size: 7, bold: true });
      } else {
        drawText(header, currentX + 2, tableStartY - 12, { size: 7, bold: true });
      }
      currentX += colWidths[i];
    });
    
    yPosition = tableStartY - rowHeight;
    
    // Table rows with offer items
    if (offer.items && offer.items.length > 0) {
      offer.items.forEach((item: any, index: number) => {
        yPosition -= rowHeight;
        currentX = 40;
        
        // Row background (alternating)
        if (index % 2 === 0) {
          drawBorderedRect(40, yPosition, width - 80, rowHeight, rgb(0.98, 0.98, 0.98));
        }
        
        const rowData = [
          (index + 1).toString(),
          item.name || 'Item Description',
          item.type === 'product' ? 'pcs' : item.type === 'service' ? 'hrs' : 'm²',
          (item.quantity || 0).toString(),
          (item.unitPrice || 0).toFixed(2),
          (item.total || 0).toFixed(2),
          (item.total || 0).toFixed(2), // Assuming completed = total for offers
          '100%', // Progress
          (item.total || 0).toFixed(2),
          (item.total || 0).toFixed(2)
        ];
        
        rowData.forEach((data, i) => {
          drawBorderedRect(currentX, yPosition, colWidths[i], rowHeight);
          const textX = i === 0 ? currentX + colWidths[i]/2 - 5 : currentX + 2; // Center number column
          drawText(data, textX, yPosition + 6, { size: 8 });
          currentX += colWidths[i];
        });
      });
    }
    
    // Add empty rows to match the design (minimum 10 rows)
    const minRows = 10;
    const currentRows = offer.items?.length || 0;
    for (let i = currentRows; i < minRows; i++) {
      yPosition -= rowHeight;
      currentX = 40;
      
      colWidths.forEach((width) => {
        drawBorderedRect(currentX, yPosition, width, rowHeight);
        currentX += width;
      });
    }
    
    // Summary section
    yPosition -= rowHeight;
    
    // TOTAL row
    currentX = 40;
    drawBorderedRect(currentX, yPosition, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight, headerBg);
    drawText('TOTAL', currentX + 10, yPosition + 6, { size: 9, bold: true });
    currentX += colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    
    const subtotal = offer.subtotal || 0;
    const total = offer.totalAmount || 0;
    
    // Total values
    const totalData = [
      subtotal.toFixed(2),
      total.toFixed(2),
      total.toFixed(2),
      '100%',
      total.toFixed(2),
      total.toFixed(2)
    ];
    
    for (let i = 4; i < colWidths.length; i++) {
      drawBorderedRect(currentX, yPosition, colWidths[i], rowHeight, headerBg);
      drawText(totalData[i - 4], currentX + 2, yPosition + 6, { size: 8, bold: true });
      currentX += colWidths[i];
    }
    
    // Tax rows
    yPosition -= rowHeight;
    currentX = 40 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];
    
    // Total without VAT
    drawBorderedRect(currentX, yPosition, colWidths[6], rowHeight, lightGray);
    drawText('Total without VAT', currentX + 2, yPosition + 6, { size: 7, bold: true });
    currentX += colWidths[6];
    
    drawBorderedRect(currentX, yPosition, colWidths[7], rowHeight);
    drawText('0.00', currentX + 2, yPosition + 6, { size: 8 });
    currentX += colWidths[7];
    
    drawBorderedRect(currentX, yPosition, colWidths[8], rowHeight);
    drawText(total.toFixed(2), currentX + 2, yPosition + 6, { size: 8, bold: true });
    currentX += colWidths[8];
    
    drawBorderedRect(currentX, yPosition, colWidths[9], rowHeight);
    drawText(total.toFixed(2), currentX + 2, yPosition + 6, { size: 8, bold: true });
    
    // VAT 20% row
    yPosition -= rowHeight;
    currentX = 40 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];
    
    drawBorderedRect(currentX, yPosition, colWidths[6], rowHeight, lightGray);
    drawText('VAT 20%', currentX + 2, yPosition + 6, { size: 7, bold: true });
    currentX += colWidths[6];
    
    const vatAmount = 0; // Tax field not available in schema
    
    drawBorderedRect(currentX, yPosition, colWidths[7], rowHeight);
    drawText('0.00', currentX + 2, yPosition + 6, { size: 8 });
    currentX += colWidths[7];
    
    drawBorderedRect(currentX, yPosition, colWidths[8], rowHeight);
    drawText(vatAmount.toFixed(2), currentX + 2, yPosition + 6, { size: 8, bold: true });
    currentX += colWidths[8];
    
    drawBorderedRect(currentX, yPosition, colWidths[9], rowHeight);
    drawText(vatAmount.toFixed(2), currentX + 2, yPosition + 6, { size: 8, bold: true });
    
    // Total with VAT row
    yPosition -= rowHeight;
    currentX = 40 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];
    
    drawBorderedRect(currentX, yPosition, colWidths[6], rowHeight, lightGray);
    drawText('Total with VAT', currentX + 2, yPosition + 6, { size: 7, bold: true });
    currentX += colWidths[6];
    
    const totalWithVat = total + vatAmount;
    
    drawBorderedRect(currentX, yPosition, colWidths[7], rowHeight);
    drawText('0.00', currentX + 2, yPosition + 6, { size: 8 });
    currentX += colWidths[7];
    
    drawBorderedRect(currentX, yPosition, colWidths[8], rowHeight, rgb(1, 1, 0.8)); // Light yellow
    drawText(totalWithVat.toFixed(2), currentX + 2, yPosition + 6, { size: 8, bold: true });
    currentX += colWidths[8];
    
    drawBorderedRect(currentX, yPosition, colWidths[9], rowHeight, rgb(1, 1, 0.8)); // Light yellow
    drawText(totalWithVat.toFixed(2), currentX + 2, yPosition + 6, { size: 8, bold: true });
    
    yPosition -= 40;
    
    // Signature section
    // Subcontractor section (left)
    drawBorderedRect(40, yPosition - 60, 300, 20, lightGray);
    drawText('SUBCONTRACTOR', 50, yPosition - 50, { size: 9, bold: true });
    
    drawBorderedRect(40, yPosition - 80, 300, 20);
    drawText('Administrator', 50, yPosition - 70, { size: 9 });
    
    drawBorderedRect(40, yPosition - 100, 300, 20);
    drawText('Project Manager', 50, yPosition - 90, { size: 9 });
    
    // Contractor section (right)
    drawBorderedRect(width - 340, yPosition - 60, 300, 20, lightGray);
    drawText('CONTRACTOR', width - 330, yPosition - 50, { size: 9, bold: true });
    
    drawBorderedRect(width - 340, yPosition - 80, 300, 20);
    drawText('Administrator', width - 330, yPosition - 70, { size: 9 });
    
    drawBorderedRect(width - 340, yPosition - 100, 300, 20);
    drawText('Site Manager', width - 330, yPosition - 90, { size: 9 });
    
    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}