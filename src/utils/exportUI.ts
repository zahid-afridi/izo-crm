import { toPng, toSvg } from 'html-to-image';

export interface ExportOptions {
  format: 'svg' | 'png';
  quality: number;
  backgroundColor: string;
}

export async function exportElementToSVG(
  element: HTMLElement,
  filename: string,
  options: Partial<ExportOptions> = {}
): Promise<void> {
  const defaultOptions: ExportOptions = {
    format: 'svg',
    quality: 1,
    backgroundColor: '#ffffff',
  };

  const finalOptions = { ...defaultOptions, ...options };

  try {
    const dataUrl = await toSvg(element, {
      quality: finalOptions.quality,
      backgroundColor: finalOptions.backgroundColor,
      cacheBust: true,
      pixelRatio: 2,
    });

    // Create download link
    const link = document.createElement('a');
    link.download = `${filename}.svg`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error exporting to SVG:', error);
    throw error;
  }
}

export async function exportElementToPNG(
  element: HTMLElement,
  filename: string,
  options: Partial<ExportOptions> = {}
): Promise<void> {
  const defaultOptions: ExportOptions = {
    format: 'png',
    quality: 1,
    backgroundColor: '#ffffff',
  };

  const finalOptions = { ...defaultOptions, ...options };

  try {
    const dataUrl = await toPng(element, {
      quality: finalOptions.quality,
      backgroundColor: finalOptions.backgroundColor,
      cacheBust: true,
      pixelRatio: 2,
    });

    // Create download link
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error exporting to PNG:', error);
    throw error;
  }
}

export async function captureCurrentPage(pageName: string, format: 'svg' | 'png' = 'svg'): Promise<void> {
  // Find the main content area
  const mainElement = document.querySelector('main');
  
  if (!mainElement) {
    console.error('Main content area not found');
    return;
  }

  const filename = `izogrup-crm-${pageName}-${new Date().getTime()}`;

  if (format === 'svg') {
    await exportElementToSVG(mainElement as HTMLElement, filename);
  } else {
    await exportElementToPNG(mainElement as HTMLElement, filename);
  }
}

export async function exportAllPages(
  pages: string[],
  setCurrentPage: (page: string) => void,
  delay: number = 1000,
  format: 'svg' | 'png' = 'svg'
): Promise<void> {
  console.log(`Starting export of ${pages.length} pages...`);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`Exporting ${page} (${i + 1}/${pages.length})...`);
    
    // Switch to the page
    setCurrentPage(page);
    
    // Wait for the page to render
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Capture the page
    await captureCurrentPage(page, format);
    
    // Small delay between exports
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('Export complete!');
}
