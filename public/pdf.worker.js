/* eslint-disable no-restricted-globals */
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');

self.onmessage = async (e) => {
  const { data } = e.data; // Expecting ArrayBuffer or Uint8Array

  try {
    // Initialize PDF.js
    // @ts-ignore
    self.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // @ts-ignore
    const pdf = await self.pdfjsLib.getDocument({ data }).promise;
    const numPages = pdf.numPages;
    const extractedText = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      
      extractedText.push({
        page: i,
        text: pageText
      });
    }

    self.postMessage({ type: 'SUCCESS', payload: extractedText });
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: error.message });
  }
};