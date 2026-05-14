import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.tide.ag'

// Generate dynamic gradient based on trading pair and performance
const generateGradient = (
  tradingPair: string,
  performance: string
): {
  background: string
  patternColor: string
  borderColor: string
} => {
  // Extract base color from trading pair
  const pairHash = tradingPair.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)

  // Determine color scheme based on performance
  const isPositive = performance.startsWith('+')
  const performanceNum = parseFloat(performance.replace(/[+%]/g, '')) || 0

  // Base colors for different scenarios
  let baseHue = pairHash % 360
  let saturation = 60
  let lightness = 50

  if (isPositive) {
    // Green/cyan range for positive performance
    baseHue = 150 + (performanceNum % 60) // 150-210 (green to cyan)
    saturation = 70 + (performanceNum % 20)
  } else {
    // Red/orange range for negative performance
    baseHue = 0 + (Math.abs(performanceNum) % 60) // 0-60 (red to orange)
    saturation = 70 + (Math.abs(performanceNum) % 20)
  }

  // Convert HSL to RGB for gradient
  const hslToRgb = (h: number, s: number, l: number) => {
    s /= 100
    l /= 100
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2
    let r = 0,
      g = 0,
      b = 0

    if (0 <= h && h < 60) {
      r = c
      g = x
      b = 0
    } else if (60 <= h && h < 120) {
      r = x
      g = c
      b = 0
    } else if (120 <= h && h < 180) {
      r = 0
      g = c
      b = x
    } else if (180 <= h && h < 240) {
      r = 0
      g = x
      b = c
    } else if (240 <= h && h < 300) {
      r = x
      g = 0
      b = c
    } else if (300 <= h && h < 360) {
      r = c
      g = 0
      b = x
    }

    r = Math.round((r + m) * 255)
    g = Math.round((g + m) * 255)
    b = Math.round((b + m) * 255)

    return { r, g, b }
  }

  const primaryColor = hslToRgb(baseHue, saturation, lightness)
  const secondaryColor = hslToRgb(
    (baseHue + 30) % 360,
    saturation - 10,
    lightness - 10
  )
  const accentColor = hslToRgb(
    (baseHue + 60) % 360,
    saturation - 20,
    lightness + 10
  )

  const background = `linear-gradient(135deg, rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.15) 0%, rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 0.1) 50%, rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, 0.05) 100%)`

  const patternColor = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.3)`
  const borderColor = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.2)`

  return { background, patternColor, borderColor }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tradingPair =
      searchParams.get('pair') || searchParams.get('tradingPair') || 'BTC/USDT'
    const performance =
      searchParams.get('performance') || searchParams.get('pnl') || '+42%'
    const referralCode =
      searchParams.get('referralCode') ||
      searchParams.get('code') ||
      'MH0P7MVEKXWFF8HJ'
    const position = searchParams.get('position') || 'Long'
    const leverage = searchParams.get('leverage') || '10x'
    const platform = searchParams.get('platform') || 'Lighter'
    const entryPrice = searchParams.get('entryPrice') || '86000'
    const markPrice = searchParams.get('markPrice') || '88000'
    const username =
      searchParams.get('username') || searchParams.get('user') || '@username'

    const referralLink = `${APP_URL}/?r=${referralCode}`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      referralLink
    )}`

    // Generate dynamic gradient based on trading pair and performance
    const gradient = generateGradient(tradingPair, performance)

    // Determine text color based on performance (red for loss, green for profit)
    const isPositive = performance.startsWith('+')
    const performanceColor = isPositive ? '#ccff00' : '#ef4444' // Green for profit, red for loss

    // Fetch and convert QR code to data URL
    let qrCodeDataUrl = ''
    try {
      const qrResponse = await fetch(qrCodeUrl)
      if (qrResponse.ok) {
        const qrArrayBuffer = await qrResponse.arrayBuffer()
        const qrBase64 = Buffer.from(qrArrayBuffer).toString('base64')
        qrCodeDataUrl = `data:image/png;base64,${qrBase64}`
      }
    } catch (error) {
      console.error('Failed to load QR code:', error)
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0e1a',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Card Container */}
          <div
            style={{
              position: 'relative',
              height: '95%',
              width: '95%',
              borderRadius: '1rem',
              padding: '3rem',
              overflow: 'hidden',
              backgroundColor: '#0d1628',
              backgroundImage: gradient.background,
              border: `1px solid ${gradient.borderColor}`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.2,
                pointerEvents: 'none',
                backgroundImage: `repeating-linear-gradient(65deg, transparent, transparent 80px, ${gradient.patternColor} 80px, ${gradient.patternColor} 84px)`,
              }}
            />

            {/* Content wrapper with relative positioning */}
            <div
              style={{
                position: 'relative',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '2rem',
                }}
              >
                {/* Logo */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <img
                    src={`${APP_URL}/tidebluefull.svg`}
                    alt="Venym"
                    style={{ width: '140px', height: '48px' }}
                  />

                </div>

                <span
                  style={{
                    color: 'white',
                    fontSize: '1.25rem',
                    fontWeight: '500',
                  }}
                >
                  {username}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '3rem',
                  width: '100%',
                  flex: 1,
                  justifyContent: 'space-between',
                }}
              >
                {/* Left Column */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2rem',
                  }}
                >
                  {/* Trading Pair */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <h2
                      style={{
                        color: 'white',
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        marginBottom: '0.75rem',
                        margin: 0,
                      }}
                    >
                      {tradingPair}
                    </h2>
                    <p
                      style={{
                        color: '#9ca3af',
                        fontSize: '0.9rem',
                        margin: 0,
                      }}
                    >
                      Best rates matched on &nbsp;
                      <span
                        style={{
                          color: '#d1d5db',
                          fontSize: '0.9rem',
                        }}
                      >
                        {platform}
                      </span>
                    </p>
                  </div>

                  {/* Long Position */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <p
                      style={{
                        color: performanceColor,
                        fontSize: '1rem',
                        fontWeight: '500',
                        marginBottom: '1rem',
                        margin: 0,
                      }}
                    >
                      {position} {leverage}
                    </p>

                    <div
                      style={{
                        color: performanceColor,
                        fontSize: '4.5rem',
                        fontWeight: 'bold',
                        lineHeight: '1.25',
                        margin: 0,
                      }}
                    >
                      {performance}
                    </div>
                  </div>

                  {/* Prices */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '2rem',
                      marginTop: 'auto',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <p
                        style={{
                          color: '#6b7280',
                          fontSize: '1rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '0.5rem',
                          margin: 0,
                        }}
                      >
                        Entry Price
                      </p>
                      <p
                        style={{
                          color: 'white',
                          fontSize: '1.75rem',
                          fontWeight: '600',
                          margin: 0,
                        }}
                      >
                        {entryPrice}
                      </p>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <p
                        style={{
                          color: '#6b7280',
                          fontSize: '1rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '0.5rem',
                          margin: 0,
                        }}
                      >
                        Mark Price
                      </p>
                      <p
                        style={{
                          color: 'white',
                          fontSize: '1.75rem',
                          fontWeight: '600',
                          margin: 0,
                        }}
                      >
                        {markPrice}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    gap: '2rem',
                  }}
                >
                  {/* Trade Info */}
                  <div
                    style={{
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2rem',
                    }}
                  >
                    <p
                      style={{
                        color: 'white',
                        fontSize: '1.5rem',
                        lineHeight: '1.625',
                        margin: 0,
                      }}
                    >
                      Trade {tradingPair.replace(/USDT$/, '')} perps on
                      <br />
                      <span style={{ fontWeight: '700', fontSize: '1.5rem' }}>
                        https://app.tide.ag
                      </span>
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.75rem',
                      }}
                    >
                      <p
                        style={{
                          color: 'white',
                          fontSize: '1.25rem',
                          marginBottom: '0.5rem',
                          margin: 0,
                          fontWeight: '500',
                          textAlign: 'right',
                        }}
                      >
                        Use my referral code:
                      </p>
                      <p
                        style={{
                          color: '#d1d5db',
                          fontSize: '1.5rem',
                          fontFamily: 'monospace',
                          margin: 0,
                          fontWeight: '700',
                          letterSpacing: '0.1em',
                          backgroundColor: 'rgba(156, 163, 175, 0.1)',
                          padding: '0.75rem 1.25rem',
                          borderRadius: '0.5rem',
                          border: '1px solid rgba(156, 163, 175, 0.3)',
                        }}
                      >
                        {referralCode}
                      </p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      backgroundColor: 'white',
                      padding: '0.75rem',
                      borderRadius: '0.75rem',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                      border: '2px solid rgba(204, 255, 0, 0.2)',
                    }}
                  >
                    <img
                      src={qrCodeDataUrl || qrCodeUrl}
                      alt="QR Code"
                      style={{
                        width: '8rem',
                        height: '8rem',
                        borderRadius: '0.5rem',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Image generation error:', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}
