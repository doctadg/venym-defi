import { Providers } from '@/components/Providers'
import type { Metadata, Viewport } from 'next'
import { Inter, Manrope } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-satoshi' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-geist' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title:
    'Tide - Perpetuals DEX Aggregator | Trade Across Hyperliquid, Aster & Lighter',
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
        title: 'Join the Tide',
        action: {
          type: 'launch_frame',
          name: 'Launch Tide',
          url: 'https://app.tide.ag',
          splashImageUrl: 'https://app.tide.ag/tide-base.png',
          splashBackgroundColor: '#0A0E17',
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
        className={`${manrope.variable} ${inter.variable} font-sans bg-[#0A0E17] text-white`}
      >
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#14192F',
              color: '#fff',
              border: '1px solid rgba(30, 64, 198, 0.3)',
              borderRadius: '16px',
              fontSize: '14px',
              backdropFilter: 'blur(10px)',
            },
            success: {
              iconTheme: {
                primary: '#56C0A6',
                secondary: '#1e2544',
              },
            },
            error: {
              iconTheme: {
                primary: '#E25C5C',
                secondary: '#1e2544',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
