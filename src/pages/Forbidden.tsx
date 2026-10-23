const STEP_X = 10.277
const STEP_Y = 11.806
const RADIUS = 147
const CX = 149.5
const CY = 149.1
const D = 2.8

type Pt = { x: number; y: number }

const DOTS: Pt[] = []
for (let y = D; y < RADIUS * 2; y += STEP_Y) {
  for (let x = D; x < RADIUS * 2; x += STEP_X) {
    const dx = x - CX
    const dy = y - CY
    if (dx * dx + dy * dy <= RADIUS * RADIUS) DOTS.push({ x, y })
  }
}

function diamond({ x, y }: Pt) {
  return `M${x} ${y - D}L${x + D} ${y}L${x} ${y + D}L${x - D} ${y}Z`
}

function DotCircle() {
  return (
    <svg className="f403-dots" viewBox="0 0 299 298" aria-hidden="true">
      <g fill="#ffffff">{DOTS.map((p, i) => <path key={i} d={diamond(p)} />)}</g>
    </svg>
  )
}

function DecoLines() {
  return (
    <svg className="f403-deco" viewBox="0 0 1920 960" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="rgba(34,109,122,0.45)" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M1512 118 C1560 96 1614 96 1660 116" />
        <path d="M1524 146 C1576 120 1640 118 1692 140" />
        <path d="M232 520 C270 496 318 494 356 512" />
        <path d="M248 548 C290 522 344 520 384 540" />
        <path d="M1694 700 c-12 -12 0 -32 18 -26 c18 6 16 30 -4 32 c-18 2 -26 -22 -12 -36 c11 -11 30 -10 40 2" />
      </g>
      <g fill="#1e6d7a">
        <circle cx="1512" cy="118" r="3.2" />
        <circle cx="1660" cy="116" r="3.2" />
        <circle cx="1524" cy="146" r="3.2" />
        <circle cx="1692" cy="140" r="3.2" />
        <circle cx="232" cy="520" r="3.2" />
        <circle cx="356" cy="512" r="3.2" />
        <circle cx="248" cy="548" r="3.2" />
        <circle cx="384" cy="540" r="3.2" />
      </g>
      <path d="M1476 236 L1506 236 L1491 264 Z" fill="rgba(34,109,122,0.45)" />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg className="f403-monitor" viewBox="0 0 240 210" aria-hidden="true">
      <rect x="36" y="14" width="168" height="126" rx="8" fill="#eef9fc" stroke="#226d7a" strokeWidth="2.5" />
      <rect x="50" y="30" width="140" height="92" rx="4" fill="#ffffff" stroke="#226d7a" strokeWidth="2" />
      <path d="M50 48 H190" stroke="#226d7a" strokeWidth="1.5" />
      <g fill="#226d7a">
        <circle cx="62" cy="39" r="2.6" />
        <circle cx="73" cy="39" r="2.6" />
        <circle cx="84" cy="39" r="2.6" />
      </g>
      <rect x="104" y="58" width="34" height="28" rx="3" fill="#17b3cc" />
      <g stroke="#cdeef4" strokeWidth="2.2" strokeLinecap="round">
        <path d="M110 66 H132" />
        <path d="M110 72 H132" />
        <path d="M110 78 H126" />
      </g>
      <path d="M106 140 L98 168" stroke="#226d7a" strokeWidth="3" strokeLinecap="round" />
      <path d="M134 140 L142 168" stroke="#226d7a" strokeWidth="3" strokeLinecap="round" />
      <path d="M90 174 C100 158 140 158 150 174 Z" fill="#eef9fc" stroke="#226d7a" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="74" y="174" width="92" height="12" rx="4" fill="#226d7a" />
    </svg>
  )
}

const BUMPS = [74, 100, 58, 122, 66, 92, 54, 112, 62, 102, 72, 86, 56, 110, 64, 94, 78, 118, 60, 88]

export default function Forbidden() {
  return (
    <div className="f403">
      <DecoLines />
      <div className="f403-content">
        <div className="f403-illo">
          <DotCircle />
          <MonitorIcon />
        </div>
        <h1 className="f403-title">403 - Forbidden</h1>
        <p className="f403-sub">Access to this page is forbidden.</p>
        <div className="error-actions">
          <a href="/" className="error-btn error-btn-primary">Return to Base</a>
          <a href="/notable-accidents/" className="error-btn">Browse Accidents</a>
        </div>
      </div>
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
