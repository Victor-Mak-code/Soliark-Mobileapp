/**
 * Extracts text content from a PDF file
 * @param pdfUrl - URL of the PDF file to extract text from
 * @returns Promise<string> - Extracted text content
 */
export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  // Only import pdfjs-dist on the client side
  if (typeof window === 'undefined') {
    throw new Error('PDF extraction is only available in the browser');
  }

  try {
    // Dynamically import pdfjs-dist only when needed (client-side only)
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set up the worker for PDF.js
    // Use local worker file from public folder (copied from node_modules)
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // Worker file is served from public folder
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;

    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF. The file may be corrupted or password-protected.');
  }
}

/**
 * Checks if a URL points to a PDF file
 * @param url - URL to check
 * @returns boolean - True if URL is a PDF
 */
export function isPDFUrl(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('application/pdf');
}

