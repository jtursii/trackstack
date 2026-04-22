import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Trackstack',
  description: 'Desktop app for Ableton Live producers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-gray-100 antialiased font-sans overflow-hidden">
        {children}
      </body>
    </html>
  )
}
