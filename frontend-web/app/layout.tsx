import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'LumpyAI | AI Cattle Health Screening',
  description: 'LumpyAI helps farmers screen cattle for possible lumpy skin disease, track records, and coordinate veterinary follow-up.',
  keywords: ['lumpy skin disease', 'cattle health', 'AI screening', 'veterinary care', 'LumpyAI'],
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-body antialiased">
        {children}
      </body>
    </html>
  );
}
