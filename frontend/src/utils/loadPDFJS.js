// Dynamically load PDF.js library for better PDF parsing
export const loadPDFJS = () => {
  return new Promise((resolve, reject) => {
    // Check if PDF.js is already loaded
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    // Create script element to load PDF.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    
    script.onload = () => {
      if (window.pdfjsLib) {
        // Configure PDF.js worker
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js failed to load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load PDF.js library'));
    };
    
    document.head.appendChild(script);
  });
};