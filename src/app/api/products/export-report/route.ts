import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryId, status, format, columns, export: shouldExport } = body;

    // Build where clause for filtering
    const where: any = {};
    
    if (categoryId && categoryId !== 'all') {
      // Filter by category (direct category or through subcategory)
      where.OR = [
        { category: { name: categoryId } },
        { subcategory: { category: { name: categoryId } } },
      ];
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }

    // Fetch all products with category information and all fields
    const products = await prisma.product.findMany({
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

    // Check if no products found
    if (products.length === 0) {
      if (!shouldExport) {
        return NextResponse.json({ 
          report: [],
          message: 'No products found for the selected filters'
        });
      } else {
        return NextResponse.json(
          { error: 'No products found for the selected filters' },
          { status: 400 }
        );
      }
    }

    // Get category information for the report
    const categories = await prisma.productCategory.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            subcategories: {
              where: {
                products: {
                  some: {},
                },
              },
            },
          },
        },
      },
    });

    // Build preview data for frontend table (filtered by selected columns)
    const buildPreviewData = (product: any) => {
      const data: any = {};
      
      if (!columns) {
        // Default columns if none specified
        return {
          id: product.id,
          title: product.title,
          category: (product.category?.name ?? product.subcategory?.category?.name) || 'Uncategorized',
          sku: product.sku || 'N/A',
          price: product.price || 0,
          stock: product.stock || 0,
          status: product.status,
          publishedOnWebsite: product.publishOnWebsite ? 'Yes' : 'No',
          createdAt: new Date(product.createdAt).toLocaleDateString(),
        };
      }

      // Add only selected columns
      if (columns.title) data.title = product.title;
      if (columns.description) data.description = product.description || 'N/A';
      if (columns.category) data.category = (product.category?.name ?? product.subcategory?.category?.name) || 'Uncategorized';
      if (columns.sku) data.sku = product.sku || 'N/A';
      if (columns.upc) data.upc = product.documents?.upc || 'N/A';
      if (columns.price) data.price = product.price || 0;
      if (columns.stock) data.stock = product.stock || 0;
      if (columns.status) data.status = product.status;
      if (columns.images) data.images = product.images?.length > 0 ? `${product.images.length} image(s)` : 'No images';
      if (columns.publishedOnWebsite) data.publishedOnWebsite = product.publishOnWebsite ? 'Yes' : 'No';
      if (columns.createdAt) data.createdAt = new Date(product.createdAt).toLocaleDateString();
      if (columns.updatedAt) data.updatedAt = new Date(product.updatedAt).toLocaleDateString();

      return data;
    };

    const previewData = products.map(buildPreviewData);

    // Build detailed report data for PDF/CSV export
    const reportData = {
      summary: {
        totalProducts: products.length,
        activeProducts: products.filter(p => p.status === 'active').length,
        publishedProducts: products.filter(p => p.publishOnWebsite).length,
        totalCategories: categories.length,
        totalValue: products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0),
        averagePrice: products.length > 0 ? products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length : 0,
      },
      categories: categories.map(cat => ({
        name: cat.name,
        productCount: cat._count.subcategories,
      })),
      products: products.map(product => ({
        id: product.id,
        title: product.title,
        description: product.description || 'N/A',
        category: (product.category?.name ?? product.subcategory?.category?.name) || 'Uncategorized',
        subcategory: product.subcategory?.name || 'N/A',
        sku: product.sku || 'N/A',
        unit: product.unit || 'N/A',
        price: product.price || 0,
        stock: product.stock || 0,
        status: product.status,
        publishOnWebsite: product.publishOnWebsite ? 'Yes' : 'No',
        enableOnlineSales: product.enableOnlineSales ? 'Yes' : 'No',
        metaTitle: product.metaTitle || 'N/A',
        metaDescription: product.metaDescription || 'N/A',
        images: product.images?.length > 0 ? product.images.join(', ') : 'No images',
        videos: product.videos?.length > 0 ? product.videos.join(', ') : 'No videos',
        documents: product.documents ? JSON.stringify(product.documents) : 'No documents',
        createdAt: new Date(product.createdAt).toLocaleDateString(),
        updatedAt: new Date(product.updatedAt).toLocaleDateString(),
      })),
      filters: {
        category: categoryId === 'all' ? 'All Categories' : categories.find(c => c.id === categoryId)?.name || categoryId || 'Unknown',
        status: status === 'all' ? 'All Statuses' : status || 'All Statuses',
      },
    };

    // PREVIEW - return simple array for table display
    if (!shouldExport) {
      return NextResponse.json({ report: previewData });
    }

    // PDF EXPORT
    if (format === 'pdf') {
      try {
        console.log('Starting PDF generation for products export...');
        const pdfBuffer = await generatePDF(reportData, columns);
        console.log('PDF generated successfully, buffer size:', pdfBuffer.length);
        
        return new NextResponse(pdfBuffer as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=products-catalog-report.pdf`,
          },
        });
      } catch (pdfError: any) {
        console.error('PDF generation error:', pdfError);
        return NextResponse.json({ error: 'PDF generation failed: ' + pdfError.message }, { status: 500 });
      }
    }

    // CSV EXPORT
    if (format === 'excel') {
      try {
        const csv = generateCSV(reportData, columns);
        const buffer = Buffer.from(csv, 'utf-8');
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=products-catalog-report.csv`,
          },
        });
      } catch (csvError: any) {
        console.error('CSV generation error:', csvError);
        return NextResponse.json({ error: 'CSV generation failed: ' + csvError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });

  } catch (err: any) {
    console.error('Export API Error:', err);
    return NextResponse.json({ error: 'Export failed: ' + err.message }, { status: 500 });
  }
}

async function generatePDF(data: any, selectedColumns?: any): Promise<Buffer> {
  try {
    console.log('PDF generation started with data:', {
      productsCount: data.products?.length || 0,
      categoriesCount: data.categories?.length || 0,
      summaryExists: !!data.summary,
      columnsSelected: selectedColumns ? Object.keys(selectedColumns).filter(k => selectedColumns[k]).length : 'all'
    });

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    
    console.log('Fonts embedded successfully');
    
    // Colors
    const primaryColor = rgb(0.15, 0.35, 0.65);
    const secondaryColor = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const darkGray = rgb(0.3, 0.3, 0.3);
    
    // Helper function to download and embed image
    const embedImageFromUrl = async (imageUrl: string) => {
      try {
        console.log('Attempting to download image:', imageUrl);
        const response = await fetch(imageUrl);
        if (!response.ok) {
          console.log('Failed to fetch image:', response.status);
          return null;
        }
        
        const imageBytes = await response.arrayBuffer();
        const uint8Array = new Uint8Array(imageBytes);
        
        // Determine image type and embed accordingly
        if (imageUrl.toLowerCase().includes('.png') || imageUrl.toLowerCase().includes('png')) {
          return await pdfDoc.embedPng(uint8Array);
        } else {
          return await pdfDoc.embedJpg(uint8Array);
        }
      } catch (error) {
        console.error('Error embedding image:', error);
        return null;
      }
    };

    // Helper function to draw text safely
    const drawText = (page: any, text: string, x: number, y: number, options: any = {}) => {
      try {
        const safeText = (text || 'N/A').toString().substring(0, options.maxLength || 100);
        page.drawText(safeText, {
          x,
          y,
          size: options.size || 10,
          font: options.bold ? helveticaBoldFont : (options.italic ? timesFont : helveticaFont),
          color: options.color || rgb(0, 0, 0),
        });
        return safeText.length * (options.size || 10) * 0.6; // Approximate text width
      } catch (textError) {
        console.error('Error drawing text:', textError, { text, x, y, options });
        page.drawText('Error', { x, y, size: 10, font: helveticaFont });
        return 50;
      }
    };

    // Helper function to draw rectangle
    const drawRect = (page: any, x: number, y: number, width: number, height: number, color: any, filled = true) => {
      if (filled) {
        page.drawRectangle({
          x, y, width, height,
          color: color,
        });
      } else {
        page.drawRectangle({
          x, y, width, height,
          borderColor: color,
          borderWidth: 1,
        });
      }
    };

    // Create cover page
    let currentPage = pdfDoc.addPage([595, 842]); // A4 size
    let { width, height } = currentPage.getSize();
    let yPosition = height - 80;

    // Header with company branding
    drawRect(currentPage, 0, height - 120, width, 120, primaryColor);
    drawText(currentPage, 'IZOGRUP', 50, height - 70, { 
      size: 28, 
      bold: true, 
      color: rgb(1, 1, 1)
    });
    drawText(currentPage, 'Construction Management System', 50, height - 95, { 
      size: 14, 
      color: rgb(0.9, 0.9, 0.9)
    });

    yPosition = height - 160;

    // Title
    drawText(currentPage, 'PRODUCTS CATALOG REPORT', 50, yPosition, { 
      size: 24, 
      bold: true, 
      color: primaryColor 
    });
    yPosition -= 40;

    // Generation info
    drawText(currentPage, `Generated: ${new Date().toLocaleString()}`, 50, yPosition, { 
      size: 12, 
      color: secondaryColor 
    });
    yPosition -= 20;
    drawText(currentPage, `Total Products: ${data.products?.length || 0}`, 50, yPosition, { 
      size: 12, 
      color: secondaryColor 
    });
    yPosition -= 60;

    // Summary Section
    if (data.summary) {
      drawText(currentPage, 'EXECUTIVE SUMMARY', 50, yPosition, { 
        size: 18, 
        bold: true, 
        color: primaryColor 
      });
      yPosition -= 30;

      // Summary box
      const summaryHeight = 140;
      drawRect(currentPage, 40, yPosition - summaryHeight, width - 80, summaryHeight, lightGray);
      drawRect(currentPage, 40, yPosition - summaryHeight, width - 80, summaryHeight, darkGray, false);

      let summaryY = yPosition - 20;
      const summaryItems = [
        { label: 'Total Products:', value: data.summary.totalProducts || 0 },
        { label: 'Active Products:', value: data.summary.activeProducts || 0 },
        { label: 'Published Products:', value: data.summary.publishedProducts || 0 },
        { label: 'Total Categories:', value: data.summary.totalCategories || 0 },
        { label: 'Total Inventory Value:', value: `€${(data.summary.totalValue || 0).toFixed(2)}` },
        { label: 'Average Price:', value: `€${(data.summary.averagePrice || 0).toFixed(2)}` }
      ];

      summaryItems.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = col === 0 ? 60 : 320;
        const y = summaryY - (row * 20);
        
        drawText(currentPage, item.label, x, y, { size: 11, bold: true });
        drawText(currentPage, item.value.toString(), x + 120, y, { size: 11, color: primaryColor });
      });

      yPosition -= summaryHeight + 40;
    }

    // Filters Section
    if (data.filters) {
      drawText(currentPage, 'APPLIED FILTERS', 50, yPosition, { 
        size: 16, 
        bold: true, 
        color: primaryColor 
      });
      yPosition -= 25;

      drawText(currentPage, `Category: ${data.filters.category || 'All'}`, 60, yPosition, { size: 11 });
      yPosition -= 18;
      drawText(currentPage, `Status: ${data.filters.status || 'All'}`, 60, yPosition, { size: 11 });
      yPosition -= 30;
    }

    // Selected Columns Info
    if (selectedColumns) {
      const selectedCols = Object.keys(selectedColumns).filter(k => selectedColumns[k]);
      drawText(currentPage, 'INCLUDED COLUMNS', 50, yPosition, { 
        size: 16, 
        bold: true, 
        color: primaryColor 
      });
      yPosition -= 25;

      const columnLabels = {
        title: 'Product Name', description: 'Description', category: 'Category',
        sku: 'SKU', upc: 'UPC', price: 'Price', stock: 'Stock',
        status: 'Status', images: 'Images', publishedOnWebsite: 'Published',
        createdAt: 'Created Date', updatedAt: 'Updated Date'
      };

      selectedCols.forEach((col, index) => {
        const colsPerRow = 3;
        const colIndex = index % colsPerRow;
        const rowIndex = Math.floor(index / colsPerRow);
        const x = 60 + (colIndex * 160);
        const y = yPosition - (rowIndex * 18);
        
        drawText(currentPage, `• ${columnLabels[col as keyof typeof columnLabels] || col}`, x, y, { size: 10 });
      });

      yPosition -= Math.ceil(selectedCols.length / 3) * 18 + 20;
    }

    // Products Section - Enhanced Layout
    if (data.products && data.products.length > 0) {
      // Start products on new page if needed
      if (yPosition < 200) {
        currentPage = pdfDoc.addPage([595, 842]);
        yPosition = height - 60;
      }

      drawText(currentPage, 'PRODUCTS CATALOG', 50, yPosition, { 
        size: 20, 
        bold: true, 
        color: primaryColor 
      });
      yPosition -= 40;

      // Determine which columns to show
      const columnsToShow = selectedColumns ? 
        Object.keys(selectedColumns).filter(k => selectedColumns[k]) : 
        ['title', 'category', 'sku', 'price', 'status'];

      // Process products with enhanced layout
      for (let i = 0; i < Math.min(data.products.length, 50); i++) { // Limit to 50 products for PDF size
        const product = data.products[i];
        
        // Check if we need a new page
        const productHeight = selectedColumns?.images && product.images?.length > 0 ? 120 : 80;
        if (yPosition < productHeight + 50) {
          currentPage = pdfDoc.addPage([595, 842]);
          yPosition = height - 60;
        }

        // Product container
        drawRect(currentPage, 40, yPosition - productHeight, width - 80, productHeight, lightGray);
        drawRect(currentPage, 40, yPosition - productHeight, width - 80, productHeight, darkGray, false);

        let productY = yPosition - 15;
        let productX = 50;

        // Product image (if images column is selected and images exist)
        if (selectedColumns?.images && product.images?.length > 0) {
          try {
            const imageUrl = product.images[0]; // Use first image
            const embeddedImage = await embedImageFromUrl(imageUrl);
            
            if (embeddedImage) {
              const imageSize = 60;
              currentPage.drawImage(embeddedImage, {
                x: productX,
                y: yPosition - productHeight + 10,
                width: imageSize,
                height: imageSize,
              });
              productX += imageSize + 15; // Move text to the right of image
            }
          } catch (imageError) {
            console.error('Error adding product image:', imageError);
          }
        }

        // Product details in columns
        const detailsStartX = productX;
        let currentX = detailsStartX;
        let currentY = productY;

        // Title (always show if selected)
        if (columnsToShow.includes('title')) {
          drawText(currentPage, product.title || 'Untitled Product', currentX, currentY, { 
            size: 12, 
            bold: true, 
            color: primaryColor,
            maxLength: 40
          });
          currentY -= 18;
        }

        // Other details in two columns
        const leftColumnX = currentX;
        const rightColumnX = currentX + 200;
        let leftY = currentY;
        let rightY = currentY;
        let useLeftColumn = true;

        columnsToShow.forEach(col => {
          if (col === 'title' || col === 'images') return; // Already handled

          let label = '';
          let value = '';

          switch (col) {
            case 'description':
              label = 'Description:';
              value = (product.description || 'N/A').substring(0, 50);
              break;
            case 'category':
              label = 'Category:';
              value = product.category || 'N/A';
              break;
            case 'sku':
              label = 'SKU:';
              value = product.sku || 'N/A';
              break;
            case 'upc':
              label = 'UPC:';
              value = product.documents?.upc || 'N/A';
              break;
            case 'price':
              label = 'Price:';
              value = `€${product.price || 0}`;
              break;
            case 'stock':
              label = 'Stock:';
              value = (product.stock || 0).toString();
              break;
            case 'status':
              label = 'Status:';
              value = product.status || 'N/A';
              break;
            case 'publishedOnWebsite':
              label = 'Published:';
              value = product.publishOnWebsite || 'No';
              break;
            case 'createdAt':
              label = 'Created:';
              value = product.createdAt || 'N/A';
              break;
            case 'updatedAt':
              label = 'Updated:';
              value = product.updatedAt || 'N/A';
              break;
          }

          if (label && value) {
            const x = useLeftColumn ? leftColumnX : rightColumnX;
            const y = useLeftColumn ? leftY : rightY;

            drawText(currentPage, label, x, y, { size: 9, bold: true });
            drawText(currentPage, value, x + 60, y, { size: 9, maxLength: 25 });

            if (useLeftColumn) {
              leftY -= 14;
            } else {
              rightY -= 14;
            }
            useLeftColumn = !useLeftColumn;
          }
        });

        yPosition -= productHeight + 10;
      }

      // Show truncation message if needed
      if (data.products.length > 50) {
        if (yPosition < 60) {
          currentPage = pdfDoc.addPage([595, 842]);
          yPosition = height - 60;
        }
        
        drawText(currentPage, `... and ${data.products.length - 50} more products`, 50, yPosition, { 
          size: 10, 
          color: secondaryColor,
          italic: true
        });
        yPosition -= 30;
        
        drawText(currentPage, 'For complete product list, please use CSV export or apply filters to reduce the dataset.', 50, yPosition, { 
          size: 9, 
          color: secondaryColor,
          italic: true
        });
      }
    }

    // Footer on last page
    const lastPage = currentPage;
    drawText(lastPage, 'Generated by IZOGRUP CRM System', 50, 30, { 
      size: 8, 
      color: secondaryColor 
    });
    drawText(lastPage, `Page ${pdfDoc.getPageCount()}`, width - 100, 30, { 
      size: 8, 
      color: secondaryColor 
    });
    
    console.log('PDF content added successfully');
    
    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();
    console.log('PDF serialized, size:', pdfBytes.length);
    
    return Buffer.from(pdfBytes);
    
  } catch (error: any) {
    console.error('PDF generation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

function generateCSV(data: any, selectedColumns?: any): string {
  let csv = 'PRODUCTS CATALOG REPORT\n\n';

  // Summary
  csv += 'SUMMARY\n';
  csv += `Total Products,${data.summary.totalProducts}\n`;
  csv += `Active Products,${data.summary.activeProducts}\n`;
  csv += `Published Products,${data.summary.publishedProducts}\n`;
  csv += `Total Categories,${data.summary.totalCategories}\n`;
  csv += `Total Inventory Value,€${data.summary.totalValue.toFixed(2)}\n`;
  csv += `Average Price,€${data.summary.averagePrice.toFixed(2)}\n\n`;

  // Filters
  csv += 'FILTERS APPLIED\n';
  csv += `Category,${data.filters.category}\n`;
  csv += `Status,${data.filters.status}\n\n`;

  // Products with selected columns only
  if (data.products.length > 0) {
    csv += 'PRODUCTS INFORMATION\n';
    
    // Build dynamic headers based on selected columns
    const headers: string[] = [];
    const columnMapping = {
      title: 'Title',
      description: 'Description',
      category: 'Category',
      sku: 'SKU',
      upc: 'UPC',
      price: 'Price',
      stock: 'Stock',
      status: 'Status',
      images: 'Images',
      publishedOnWebsite: 'Published on Website',
      createdAt: 'Created Date',
      updatedAt: 'Updated Date'
    };

    // Add headers for selected columns
    Object.keys(selectedColumns || {}).forEach(key => {
      if (selectedColumns[key] && columnMapping[key as keyof typeof columnMapping]) {
        headers.push(columnMapping[key as keyof typeof columnMapping]);
      }
    });

    csv += headers.join(',') + '\n';

    // Add product data for selected columns
    data.products.forEach((product: any) => {
      const row: string[] = [];
      
      Object.keys(selectedColumns || {}).forEach(key => {
        if (selectedColumns[key]) {
          let value = '';
          switch (key) {
            case 'title':
              value = product.title || 'N/A';
              break;
            case 'description':
              value = product.description || 'N/A';
              break;
            case 'category':
              value = product.category || 'N/A';
              break;
            case 'sku':
              value = product.sku || 'N/A';
              break;
            case 'upc':
              value = product.documents?.upc || 'N/A';
              break;
            case 'price':
              value = `€${product.price || 0}`;
              break;
            case 'stock':
              value = product.stock || 0;
              break;
            case 'status':
              value = product.status || 'N/A';
              break;
            case 'images':
              value = product.images || 'No images';
              break;
            case 'publishedOnWebsite':
              value = product.publishOnWebsite || 'No';
              break;
            case 'createdAt':
              value = product.createdAt || 'N/A';
              break;
            case 'updatedAt':
              value = product.updatedAt || 'N/A';
              break;
            default:
              value = 'N/A';
          }
          row.push(`"${value}"`);
        }
      });
      
      csv += row.join(',') + '\n';
    });
  }

  return csv;
}