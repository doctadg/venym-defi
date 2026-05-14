import { Providers } from '@/components/Providers'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title:
    'Venym - Perpetuals DEX Aggregator | Trade Across Hyperliquid, Aster & Lighter',
  description:
    'Trade perpetual futures across multiple decentralized exchanges with optimal routing. Real-time order books, advanced charting, and unified portfolio management.',
  icons: {
    icon: '/tide-base.png',
  },
  other: {
    'base:app_id': '6971da3688e3bac59cf3d31c',
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: 'https://app.tide.ag/tidescreen.png',
      button: {
        title: 'Open Venym',
        action: {
          type: 'launch_frame',
          name: 'Launch Venym',
          url: 'https://app.tide.ag',
          splashImageUrl: 'https://app.tide.ag/tide-base.png',
          splashBackgroundColor: '#050505',
        },
      },
    }),
  },
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/bg.jpg" as="image" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-[#050505] text-[#e4e4e7]`}
      >
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#121212',
              color: '#e4e4e7',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              fontSize: '14px',
              backdropFilter: 'blur(10px)',
            },
            success: {
              iconTheme: {
                primary: '#56C0A6',
                secondary: '#121212',
              },
            },
            error: {
              iconTheme: {
                primary: '#E25C5C',
                secondary: '#121212',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
