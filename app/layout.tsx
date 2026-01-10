import React from 'react';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notes to Docs',
  description: 'Turn rough notes and screenshots into professional documentation and Knowledge Base articles using Gemini.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* PDF.js configuration for LivePreview component */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" async />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onload = function() {
                if(window.pdfjsLib) {
                  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }
              };
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-zinc-950 bg-dot-grid font-sans antialiased text-zinc-50 selection:bg-blue-500/30">
        {children}
      </body>
    </html>
  );
}