import React from 'react';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 bg-dot-grid font-sans antialiased text-zinc-50 selection:bg-blue-500/30">
        {children}
    </div>
  );
}