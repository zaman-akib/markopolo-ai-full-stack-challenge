import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OmniPulse - AI Campaign Generator',
  description: 'Connect data sources and generate targeted campaigns with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}