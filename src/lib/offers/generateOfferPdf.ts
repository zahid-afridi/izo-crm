import { PDFDocument, PDFImage, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '@/lib/prisma';

export type OfferPdfBranding = {
  companyName: string;
  tagline?: string | null;
  legalName?: string | null;
  primaryRgb: { r: number; g: number; b: number };
  logoImageBytes?: Uint8Array | null;
};

export function hexToRgb01(hex: string | null | undefined): { r: number; g: number; b: number } {
  if (!hex || typeof hex !== 'string') {
    return { r: 0.1, g: 0.2, b: 0.4 };
  }
  const h = hex.replace('#', '').trim();
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
    };
  }
  return { r: 0.1, g: 0.2, b: 0.4 };
}

async function fetchLogoBytes(logoUrl: string | null | undefined): Promise<Uint8Array | null> {
  if (!logoUrl?.trim()) return null;
  try {
    const res = await fetch(logoUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function loadOfferPdfBranding(): Promise<OfferPdfBranding> {
  const settings = await prisma.companySetting.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  const companyName =
    settings?.companyDisplayName?.trim() || settings?.legalName?.trim() || 'Company';
  const tagline = settings?.tagline?.trim() || null;
  const legalName = settings?.legalName?.trim() || null;
  const primaryRgb = hexToRgb01(settings?.brandColorStart || settings?.brandColorMid || '#1B2556');
  const logoImageBytes = await fetchLogoBytes(settings?.logoUrl ?? null);

  return {
    companyName,
    tagline,
    legalName,
    primaryRgb,
    logoImageBytes,
  };
}

function defaultBranding(): OfferPdfBranding {
  return {
    companyName: 'Company',
    tagline: null,
    legalName: null,
    primaryRgb: { r: 0.1, g: 0.2, b: 0.4 },
    logoImageBytes: null,
  };
}

/**
 * Generates offer PDF (A4 landscape, multi-page) with optional company branding.
 */
export async function generateOfferPdf(
  offer: any,
  brandingInput?: OfferPdfBranding | null
): Promise<Buffer> {
  const branding = brandingInput ?? defaultBranding();
  const darkBlue = rgb(
    branding.primaryRgb.r,
    branding.primaryRgb.g,
    branding.primaryRgb.b
  );
  const contractorName = branding.legalName || branding.companyName;

  try {
    const pdfDoc = await PDFDocument.create();

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let logoImage: PDFImage | null = null;
    if (branding.logoImageBytes?.length) {
      try {
        logoImage = await pdfDoc.embedPng(branding.logoImageBytes);
      } catch {
        try {
          logoImage = await pdfDoc.embedJpg(branding.logoImageBytes);
        } catch {
          logoImage = null;
        }
      }
    }

    const pageWidth = 842;
    const pageHeight = 595;
    const lightGray = rgb(0.95, 0.95, 0.95);
    const borderColor = rgb(0, 0, 0);
    const headerBg = rgb(0.9, 0.9, 0.9);

    const currencySymbol =
      offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : 'Lek ';

    const rowHeight = 18;
    const colWidths = [30, 200, 60, 50, 70, 70, 70, 70, 70, 70];
    const headers = [
      'No.',
      'DESCRIPTION',
      'UNIT',
      'QTY',
      `UNIT PRICE\n(${currencySymbol})`,
      'TOTAL\nCONTRACT',
      'ACTUAL\nCOMPLETED',
      'PROGRESS\nCOMPLETED',
      'VALUE\nCONTRACT',
      'VALUE\nACTUAL',
    ];

    const headerHeight = 200;
    const footerHeight = 200;
    const availableHeight = pageHeight - headerHeight - footerHeight;
    const maxRowsPerPage = Math.max(1, Math.floor(availableHeight / rowHeight) - 1);

    const items = offer.items || [];
    const totalPages = Math.ceil(items.length / maxRowsPerPage) || 1;

    const drawText = (
      page: any,
      text: string,
      x: number,
      y: number,
      options: any = {}
    ) => {
      page.drawText(text || '', {
        x,
        y,
        size: options.size || 9,
        font: options.bold ? helveticaBoldFont : helveticaFont,
        color: options.color || rgb(0, 0, 0),
        maxWidth: options.maxWidth || 200,
      });
    };

    const drawBorderedRect = (
      page: any,
      x: number,
      y: number,
      w: number,
      h: number,
      fillColor?: any,
      borderWidth = 0.5
    ) => {
      if (fillColor) {
        page.drawRectangle({
          x,
          y,
          width: w,
          height: h,
          color: fillColor,
        });
      }
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        borderColor,
        borderWidth,
      });
    };

    const drawPageHeader = (page: any, pageNumber: number) => {
      let yPosition = pageHeight - 40;

      drawBorderedRect(page, 30, 30, pageWidth - 60, pageHeight - 60, undefined, 2);

      const headerY = pageHeight - 80;

      drawBorderedRect(page, 40, headerY - 40, 300, 40, lightGray);

      let textLeft = 50;
      if (logoImage) {
        const logoH = 32;
        const scale = logoH / logoImage.height;
        const logoW = logoImage.width * scale;
        page.drawImage(logoImage, {
          x: 48,
          y: headerY - 36,
          width: logoW,
          height: logoH,
        });
        textLeft = 48 + logoW + 10;
      }

      const nameLine = (branding.companyName || 'Company').slice(0, 42);
      drawText(page, nameLine, textLeft, headerY - 15, {
        size: 14,
        bold: true,
        color: darkBlue,
        maxWidth: 220,
      });
      const sub =
        branding.tagline?.slice(0, 48) || 'Offer & quotation';
      drawText(page, sub, textLeft, headerY - 30, { size: 8, color: darkBlue, maxWidth: 220 });

      drawBorderedRect(page, pageWidth - 180, headerY - 40, 140, 40, lightGray);
      drawText(page, `Date: ${new Date().toLocaleDateString()}`, pageWidth - 170, headerY - 25, {
        size: 9,
        bold: true,
      });

      if (totalPages > 1) {
        drawText(page, `Page ${pageNumber} of ${totalPages}`, pageWidth - 170, headerY - 35, {
          size: 8,
        });
      }

      yPosition = headerY - 60;

      drawBorderedRect(page, 40, yPosition - 25, pageWidth - 80, 25, headerBg);
      drawText(page, 'OFFER', pageWidth / 2 - 28, yPosition - 15, { size: 12, bold: true });

      yPosition -= 45;

      if (pageNumber === 1) {
        drawBorderedRect(page, 40, yPosition - 20, pageWidth - 80, 20, lightGray);
        drawText(page, `PROJECT: ${offer.title || '—'}`, 50, yPosition - 12, {
          size: 9,
          bold: true,
        });

        yPosition -= 25;

        drawBorderedRect(page, 40, yPosition - 40, pageWidth - 80, 40, undefined);

        drawText(page, 'CLIENT:', 50, yPosition - 12, { size: 9, bold: true });
        drawText(page, 'CONTRACTOR:', 50, yPosition - 25, { size: 9, bold: true });
        drawText(page, 'SUBCONTRACTOR:', 50, yPosition - 38, { size: 9, bold: true });

        drawText(page, 'WORK TYPE:', 250, yPosition - 12, { size: 9, bold: true });
        drawText(page, contractorName.slice(0, 40), 250, yPosition - 25, { size: 9 });

        drawText(page, 'Unit:', 450, yPosition - 12, { size: 9, bold: true });
        drawText(page, `Offer No: ${offer.offerNumber}`, 450, yPosition - 25, { size: 9 });
        drawText(page, 'Location:', 450, yPosition - 38, { size: 9 });

        drawText(page, offer.client || '—', 120, yPosition - 12, { size: 9 });
        drawText(page, '—', 320, yPosition - 12, { size: 9 });
        drawText(page, '—', 480, yPosition - 12, { size: 9 });
        drawText(page, '—', 500, yPosition - 38, { size: 9 });

        yPosition -= 60;
      } else {
        drawBorderedRect(page, 40, yPosition - 20, pageWidth - 80, 20, lightGray);
        drawText(page, `PROJECT: ${offer.title || '—'} (continued)`, 50, yPosition - 12, {
          size: 9,
          bold: true,
        });
        yPosition -= 40;
      }

      return yPosition;
    };

    const drawTableHeader = (page: any, yPosition: number) => {
      drawBorderedRect(page, 40, yPosition - rowHeight, pageWidth - 80, rowHeight, headerBg);

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

    const drawTableRow = (
      page: any,
      item: any,
      _index: number,
      yPosition: number,
      globalIndex: number
    ) => {
      if (globalIndex % 2 === 0) {
        drawBorderedRect(page, 40, yPosition, pageWidth - 80, rowHeight, rgb(0.98, 0.98, 0.98));
      }

      const rowData = [
        (globalIndex + 1).toString(),
        item.name || '—',
        item.type === 'product' ? 'pcs' : item.type === 'service' ? 'hrs' : 'm²',
        (item.quantity || 0).toString(),
        `${currencySymbol}${(item.unitPrice || 0).toFixed(2)}`,
        `${currencySymbol}${(item.total || 0).toFixed(2)}`,
        `${currencySymbol}${(item.total || 0).toFixed(2)}`,
        '100%',
        `${currencySymbol}${(item.total || 0).toFixed(2)}`,
        `${currencySymbol}${(item.total || 0).toFixed(2)}`,
      ];

      let currentX = 40;
      rowData.forEach((data, i) => {
        drawBorderedRect(page, currentX, yPosition, colWidths[i], rowHeight);
        const textX = i === 0 ? currentX + colWidths[i] / 2 - 5 : currentX + 2;
        drawText(page, data, textX, yPosition + 6, { size: 8 });
        currentX += colWidths[i];
      });

      return yPosition - rowHeight;
    };

    const drawSummarySection = (page: any, yPosition: number) => {
      const subtotal = offer.subtotal || 0;
      const total = offer.totalAmount || 0;

      let currentX = 40;
      drawBorderedRect(
        page,
        currentX,
        yPosition,
        colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
        rowHeight,
        headerBg
      );
      drawText(page, 'TOTAL', currentX + 10, yPosition + 6, { size: 9, bold: true });
      currentX += colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];

      const totalData = [
        `${currencySymbol}${subtotal.toFixed(2)}`,
        `${currencySymbol}${total.toFixed(2)}`,
        `${currencySymbol}${total.toFixed(2)}`,
        '100%',
        `${currencySymbol}${total.toFixed(2)}`,
        `${currencySymbol}${total.toFixed(2)}`,
      ];

      for (let i = 4; i < colWidths.length; i++) {
        drawBorderedRect(page, currentX, yPosition, colWidths[i], rowHeight, headerBg);
        drawText(page, totalData[i - 4], currentX + 2, yPosition + 6, { size: 8, bold: true });
        currentX += colWidths[i];
      }

      yPosition -= rowHeight;

      currentX = 40 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];

      drawBorderedRect(page, currentX, yPosition, colWidths[6], rowHeight, lightGray);
      drawText(page, 'Total without VAT', currentX + 2, yPosition + 6, { size: 7, bold: true });
      currentX += colWidths[6];

      drawBorderedRect(page, currentX, yPosition, colWidths[7], rowHeight);
      drawText(page, `${currencySymbol}0.00`, currentX + 2, yPosition + 6, { size: 8 });
      currentX += colWidths[7];

      drawBorderedRect(page, currentX, yPosition, colWidths[8], rowHeight);
      drawText(page, `${currencySymbol}${total.toFixed(2)}`, currentX + 2, yPosition + 6, {
        size: 8,
        bold: true,
      });
      currentX += colWidths[8];

      drawBorderedRect(page, currentX, yPosition, colWidths[9], rowHeight);
      drawText(page, `${currencySymbol}${total.toFixed(2)}`, currentX + 2, yPosition + 6, {
        size: 8,
        bold: true,
      });

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

      yPosition -= rowHeight;
      currentX = 40 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];

      drawBorderedRect(page, currentX, yPosition, colWidths[6], rowHeight, lightGray);
      drawText(page, 'Total with VAT', currentX + 2, yPosition + 6, { size: 7, bold: true });
      currentX += colWidths[6];

      drawBorderedRect(page, currentX, yPosition, colWidths[7], rowHeight);
      drawText(page, `${currencySymbol}0.00`, currentX + 2, yPosition + 6, { size: 8 });
      currentX += colWidths[7];

      drawBorderedRect(page, currentX, yPosition, colWidths[8], rowHeight, rgb(1, 1, 0.8));
      drawText(page, `${currencySymbol}${total.toFixed(2)}`, currentX + 2, yPosition + 6, {
        size: 8,
        bold: true,
      });
      currentX += colWidths[8];

      drawBorderedRect(page, currentX, yPosition, colWidths[9], rowHeight, rgb(1, 1, 0.8));
      drawText(page, `${currencySymbol}${total.toFixed(2)}`, currentX + 2, yPosition + 6, {
        size: 8,
        bold: true,
      });

      return yPosition - 40;
    };

    const drawSignatureSection = (page: any, yPosition: number) => {
      drawBorderedRect(page, 40, yPosition - 60, 300, 20, lightGray);
      drawText(page, 'SUBCONTRACTOR', 50, yPosition - 50, { size: 9, bold: true });

      drawBorderedRect(page, 40, yPosition - 80, 300, 20);
      drawText(page, 'Administrator', 50, yPosition - 70, { size: 9 });

      drawBorderedRect(page, 40, yPosition - 100, 300, 20);
      drawText(page, 'Project Manager', 50, yPosition - 90, { size: 9 });

      drawBorderedRect(page, pageWidth - 340, yPosition - 60, 300, 20, lightGray);
      drawText(page, 'CONTRACTOR', pageWidth - 330, yPosition - 50, { size: 9, bold: true });

      drawBorderedRect(page, pageWidth - 340, yPosition - 80, 300, 20);
      drawText(page, 'Administrator', pageWidth - 330, yPosition - 70, { size: 9 });

      drawBorderedRect(page, pageWidth - 340, yPosition - 100, 300, 20);
      drawText(page, 'Site Manager', pageWidth - 330, yPosition - 90, { size: 9 });
    };

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      let yPosition = drawPageHeader(page, pageNum);

      yPosition = drawTableHeader(page, yPosition);

      const startIndex = (pageNum - 1) * maxRowsPerPage;
      const endIndex = Math.min(startIndex + maxRowsPerPage, items.length);
      const pageItems = items.slice(startIndex, endIndex);

      pageItems.forEach((item: any, localIndex: number) => {
        const globalIndex = startIndex + localIndex;
        yPosition = drawTableRow(page, item, localIndex, yPosition, globalIndex);
      });

      const remainingRows = maxRowsPerPage - pageItems.length;
      for (let i = 0; i < remainingRows; i++) {
        let currentX = 40;
        colWidths.forEach((width) => {
          drawBorderedRect(page, currentX, yPosition, width, rowHeight);
          currentX += width;
        });
        yPosition -= rowHeight;
      }

      if (pageNum === totalPages) {
        yPosition = drawSummarySection(page, yPosition);
        drawSignatureSection(page, yPosition);
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}
