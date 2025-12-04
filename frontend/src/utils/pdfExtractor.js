import { loadPDFJS } from './loadPDFJS';

// PDF text extraction utility using PDF.js
export const extractTextFromPDF = async (file) => {
  try {
    // Load PDF.js library dynamically
    const pdfjsLib = await loadPDFJS();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          
          // Use PDF.js to extract text
          const pdf = await pdfjsLib.getDocument({ 
            data: arrayBuffer,
            verbosity: 0 // Reduce console output
          }).promise;
          
          let fullText = '';
          
          // Extract text from all pages
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Combine text items with proper spacing
            const pageText = textContent.items
              .map(item => item.str)
              .join(' ')
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
            
            if (pageText) {
              fullText += pageText + '\n\n';
            }
          }
          
          // Clean up the final text
          fullText = fullText
            .trim()
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
            .replace(/\s+/g, ' '); // Normalize spaces
          
          if (fullText.length < 50) {
            throw new Error('PDF appears to be empty or contains no readable text');
          }
          
          resolve(fullText);
        } catch (error) {
          reject(new Error('Failed to extract text from PDF: ' + error.message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read PDF file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    // Fallback to basic extraction if PDF.js fails to load
    console.warn('PDF.js failed to load, using fallback extraction:', error);
    return extractTextFromPDFBasic(file);
  }
};

// Fallback PDF text extraction without external libraries
const extractTextFromPDFBasic = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        let text = '';
        
        // Simple text extraction from PDF binary
        for (let i = 0; i < uint8Array.length - 1; i++) {
          const char = uint8Array[i];
          // Extract readable ASCII characters
          if (char >= 32 && char <= 126) {
            text += String.fromCharCode(char);
          } else if (char === 10 || char === 13) {
            text += ' ';
          }
        }
        
        // Clean up extracted text
        text = text
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s.,!?;:()\-"']/g, '')
          .trim();
        
        if (text.length < 100) {
          throw new Error('Could not extract readable text from PDF. Please try copying and pasting the text manually.');
        }
        
        resolve(text);
      } catch (error) {
        reject(new Error('Basic PDF extraction failed: ' + error.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read PDF file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Alternative: Use a more robust PDF parsing approach
export const extractTextFromPDFAdvanced = async (file) => {
  // This would use a library like pdf-parse or pdfjs-dist
  // For now, we'll implement a basic version
  
  try {
    const formData = new FormData();
    formData.append('pdf', file);
    
    // If you have a backend PDF parsing service, you could call it here
    // const response = await fetch('/api/extract-pdf-text', {
    //   method: 'POST',
    //   body: formData
    // });
    // return await response.text();
    
    // For client-side only, fall back to basic extraction
    return await extractTextFromPDF(file);
  } catch (error) {
    throw new Error('PDF text extraction failed: ' + error.message);
  }
};