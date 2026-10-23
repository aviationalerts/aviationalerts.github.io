import type { ReactNode } from 'react'

const HALFTONE: { x: number; y: number }[] = []
for (let y = -100; y <= 100; y += 10) {
  for (let x = -100; x <= 100; x += 10) {
    if (x * x + y * y <= 100 * 100) HALFTONE.push({ x, y })
  }
}

const BUMPS = [74, 100, 58, 122, 66, 92, 54, 112, 62, 102, 72, 86, 56, 110, 64, 94, 78, 118, 60, 88]

export function ErrorScene({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children?: ReactNode
}) {
  return (
    <div className="error-scene">
      <svg
        className="error-deco"
        viewBox="0 0 1920 960"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g fill="none" stroke="#2e7f8f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="692" cy="64" r="13" />
          <circle cx="432" cy="144" r="11" />
          <circle cx="1476" cy="234" r="11" />
          <path d="M1453 86 L1483 86 L1468 114 Z" />
          <path d="M717 276 L717 306 L689 291 Z" />
          <path d="M1286 276 L1314 291 L1286 306 Z" />
          <path d="M424 392 L477 366" />
          <path d="M436 408 L489 382" />
          <path d="M1440 456 c-12 -12 0 -32 18 -26 c18 6 16 30 -4 32 c-18 2 -26 -22 -12 -36 c11 -11 30 -10 40 2" />
        </g>
      </svg>

      <div className="error-content">
        <div className="error-illo">
          <svg className="error-halftone" viewBox="0 0 240 240" aria-hidden="true">
            <g fill="#ffffff" fillOpacity="0.9">
              {HALFTONE.map((d, i) => (
                <circle key={i} cx={120 + d.x} cy={120 + d.y} r="2.2" />
              ))}
            </g>
          </svg>
          <svg className="error-monitor" viewBox="0 0 240 200" aria-hidden="true">
            <g stroke="#2b7f90" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M102 138 L95 161" />
              <path d="M114 138 L121 161" />
              <path d="M86 163 H130" />
              <rect x="20" y="14" width="176" height="124" rx="12" fill="#ffffff" />
              <rect x="34" y="28" width="148" height="96" rx="6" fill="#ffffff" strokeWidth="2" />
              <path d="M34 50 H182" strokeWidth="2" />
            </g>
            <g fill="#2b7f90">
              <circle cx="46" cy="39" r="3" />
              <circle cx="58" cy="39" r="3" />
              <circle cx="70" cy="39" r="3" />
            </g>
            <path
              d="M97 84 V74 a11 11 0 0 1 22 0 V84"
              fill="none"
              stroke="#2b7f90"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <rect x="92" y="84" width="32" height="26" rx="3" fill="#2fa6b8" />
            <g stroke="#d8f2f6" strokeWidth="2.5" strokeLinecap="round">
              <path d="M98 91 H118" />
              <path d="M98 96.5 H118" />
              <path d="M98 102 H118" />
              <path d="M98 107.5 H118" />
            </g>
          </svg>
        </div>

        <h1 className="error-title">{title}</h1>
        <p className="error-sub">{subtitle}</p>
        {children && <div className="error-actions">{children}</div>}
      </div>

      <div className="error-floorline" aria-hidden="true" />

      <div className="error-clouds" aria-hidden="true">
        <div className="cloud-bumps">
          {BUMPS.map((r, i) => (
            <span key={i} style={{ width: r * 2, height: r * 2 }} />
          ))}
        </div>
        <div className="cloud-base" />
      </div>
    </div>
  )
}
