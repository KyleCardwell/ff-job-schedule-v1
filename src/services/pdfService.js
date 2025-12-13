const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Generate PDF using Playwright backend
 * @param {string} url - URL to convert to PDF
 * @param {object} options - PDF generation options
 * @returns {Promise<Blob>} PDF as Blob
 */
export async function generatePdfFromUrl(url, options = {}) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        options: {
          format: 'Letter',
          printBackground: true,
          margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          },
          ...options
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate PDF');
    }

    const data = await response.json();
    
    if (data.success) {
      return base64ToBlob(data.pdf, 'application/pdf');
    } else {
      throw new Error('PDF generation failed');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Generate PDF from HTML content
 * @param {string} html - HTML content to convert
 * @param {object} options - PDF generation options
 * @returns {Promise<Blob>} PDF as Blob
 */
export async function generatePdfFromHtml(html, options = {}) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html,
        options: {
          format: 'Letter',
          printBackground: true,
          margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          },
          ...options
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate PDF');
    }

    const data = await response.json();
    
    if (data.success) {
      return base64ToBlob(data.pdf, 'application/pdf');
    } else {
      throw new Error('PDF generation failed');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Download PDF blob as file
 * @param {Blob} blob - PDF blob
 * @param {string} filename - Desired filename
 */
export function downloadPdf(blob, filename = 'document.pdf') {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Convert base64 string to Blob
 * @param {string} base64 - Base64 encoded data
 * @param {string} contentType - MIME type
 * @returns {Blob}
 */
function base64ToBlob(base64, contentType) {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: contentType });
}

/**
 * Check backend health
 * @returns {Promise<object>} Health status
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    return await response.json();
  } catch (error) {
    console.error('Backend health check failed:', error);
    throw error;
  }
}
