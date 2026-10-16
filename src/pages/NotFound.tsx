import { useEffect, useRef } from 'react'

export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const c = canvas.getContext('2d')!

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    let raf = 0
    let t = 0

    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    // ── Math symbols floating in space ──
    const symbols = ['∑', '∫', 'Δ', 'π', '∞', '√', '∂', 'λ', 'μ', 'σ', '≈', '≠', '×', '÷', 'θ', 'ω', 'α', 'β', '∇', 'ε', 'ℏ', '∂²', '→', '≡', '∝']
    const floatingSymbols = Array.from({ length: 40 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      char: symbols[Math.floor(Math.random() * symbols.length)],
      size: 10 + Math.random() * 22,
      speed: 0.15 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 0.3,
      opacity: 0.04 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
    }))

    // ── Erratic flight path points (the plane's doomed trajectory) ──
    const pathPoints: { x: number; y: number; age: number }[] = []
    let pathPhase = 0

    // ── Particles trailing from plane ──
    const particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = []

    // ── Grid ──
    function drawGrid() {
      c.strokeStyle = 'rgba(232, 163, 58, 0.03)'
      c.lineWidth = 1
      const spacing = 60
      for (let x = 0; x < w; x += spacing) {
        c.beginPath()
        c.moveTo(x, 0)
        c.lineTo(x, h)
        c.stroke()
      }
      for (let y = 0; y < h; y += spacing) {
        c.beginPath()
        c.moveTo(0, y)
        c.lineTo(w, y)
        c.stroke()
      }
    }

    // ── Radar sweep ──
    function drawRadar() {
      const cx = w * 0.82
      const cy = h * 0.2
      const r = 120
      const angle = t * 0.008

      c.save()
      // Rings
      for (let i = 1; i <= 4; i++) {
        c.beginPath()
        c.arc(cx, cy, (r / 4) * i, 0, Math.PI * 2)
        c.strokeStyle = `rgba(232, 163, 58, ${0.06 + i * 0.01})`
        c.lineWidth = 1
        c.stroke()
      }
      // Cross lines
      c.beginPath()
      c.moveTo(cx - r, cy)
      c.lineTo(cx + r, cy)
      c.moveTo(cx, cy - r)
      c.lineTo(cx, cy + r)
      c.strokeStyle = 'rgba(232, 163, 58, 0.05)'
      c.stroke()
      // Sweep
      c.beginPath()
      c.moveTo(cx, cy)
      c.arc(cx, cy, r, angle - 0.4, angle)
      c.closePath()
      c.fillStyle = 'rgba(232, 163, 58, 0.06)'
      c.fill()
      // Sweep line
      c.beginPath()
      c.moveTo(cx, cy)
      c.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
      c.strokeStyle = 'rgba(232, 163, 58, 0.2)'
      c.lineWidth = 1.5
      c.stroke()
      c.restore()
    }

    // ── Floating math ──
    function drawSymbols() {
      c.save()
      for (const s of floatingSymbols) {
        s.y -= s.speed
        s.x += Math.sin(t * 0.002 + s.phase) * 0.3 + s.drift
        if (s.y < -30) {
          s.y = h + 30
          s.x = Math.random() * w
        }
        const pulse = 1 + Math.sin(t * 0.01 + s.phase) * 0.15
        c.font = `${s.size * pulse}px "IBM Plex Mono", monospace`
        c.fillStyle = `rgba(232, 163, 58, ${s.opacity * pulse})`
        c.fillText(s.char, s.x, s.y)
      }
      c.restore()
    }

    // ── The tumbling plane path ──
    function updatePath() {
      pathPhase += 0.016
      const cx = w * 0.5
      const cy = h * 0.45
      const x =
        cx +
        Math.sin(pathPhase * 1.3) * w * 0.25 +
        Math.sin(pathPhase * 2.7) * w * 0.1 +
        Math.cos(pathPhase * 0.7) * w * 0.05
      const y =
        cy +
        Math.cos(pathPhase * 1.7) * h * 0.15 +
        Math.sin(pathPhase * 3.1) * h * 0.08 +
        Math.sin(pathPhase * 0.5) * h * 0.04
      pathPoints.push({ x, y, age: 0 })
      if (pathPoints.length > 200) pathPoints.shift()

      // Emit particles
      if (Math.random() > 0.3) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 + 0.3,
          life: 0,
          maxLife: 40 + Math.random() * 30,
        })
      }
    }

    function drawPath() {
      if (pathPoints.length < 2) return
      c.save()
      for (let i = 1; i < pathPoints.length; i++) {
        const p0 = pathPoints[i - 1]
        const p1 = pathPoints[i]
        const age = i / pathPoints.length
        c.beginPath()
        c.moveTo(p0.x, p0.y)
        c.lineTo(p1.x, p1.y)
        c.strokeStyle = `rgba(232, 163, 58, ${age * 0.3})`
        c.lineWidth = age * 2.5
        c.stroke()
      }
      c.restore()
    }

    function drawParticles() {
      c.save()
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life++
        if (p.life > p.maxLife) {
          particles.splice(i, 1)
          continue
        }
        const alpha = 1 - p.life / p.maxLife
        c.beginPath()
        c.arc(p.x, p.y, 1.5 * alpha, 0, Math.PI * 2)
        c.fillStyle = `rgba(232, 163, 58, ${alpha * 0.25})`
        c.fill()
      }
      c.restore()
    }

    function drawPlane() {
      if (pathPoints.length < 2) return
      const p = pathPoints[pathPoints.length - 1]
      const prev = pathPoints[pathPoints.length - 6] || p
      const angle = Math.atan2(p.y - prev.y, p.x - prev.x)
      const bankAngle = Math.sin(t * 0.05) * 0.4

      c.save()
      c.translate(p.x, p.y)
      c.rotate(angle + bankAngle * 0.3)

      // Plane silhouette — simple fighter shape
      c.fillStyle = '#e8a33a'
      c.shadowColor = 'rgba(232, 163, 58, 0.6)'
      c.shadowBlur = 20

      // Fuselage
      c.beginPath()
      c.moveTo(18, 0)
      c.lineTo(-10, -3)
      c.lineTo(-14, 0)
      c.lineTo(-10, 3)
      c.closePath()
      c.fill()

      // Wings
      c.beginPath()
      c.moveTo(4, 0)
      c.lineTo(-4, -12)
      c.lineTo(-7, -12)
      c.lineTo(-2, 0)
      c.closePath()
      c.fill()
      c.beginPath()
      c.moveTo(4, 0)
      c.lineTo(-4, 12)
      c.lineTo(-7, 12)
      c.lineTo(-2, 0)
      c.closePath()
      c.fill()

      // Tail
      c.beginPath()
      c.moveTo(-10, 0)
      c.lineTo(-14, -6)
      c.lineTo(-16, -6)
      c.lineTo(-14, 0)
      c.closePath()
      c.fill()

      c.shadowBlur = 0
      c.restore()

      // Reticle / target ring around plane
      c.save()
      c.beginPath()
      c.arc(p.x, p.y, 30 + Math.sin(t * 0.06) * 5, 0, Math.PI * 2)
      c.strokeStyle = 'rgba(224, 69, 53, 0.25)'
      c.lineWidth = 1
      c.setLineDash([4, 6])
      c.stroke()
      c.setLineDash([])

      // Crosshair ticks
      const ticks = [22, 38]
      for (const r of ticks) {
        c.beginPath()
        c.moveTo(p.x - r, p.y)
        c.lineTo(p.x - r + 6, p.y)
        c.moveTo(p.x + r - 6, p.y)
        c.lineTo(p.x + r, p.y)
        c.moveTo(p.x, p.y - r)
        c.lineTo(p.x, p.y - r + 6)
        c.moveTo(p.x, p.y + r - 6)
        c.lineTo(p.x, p.y + r)
        c.strokeStyle = 'rgba(224, 69, 53, 0.2)'
        c.lineWidth = 1
        c.stroke()
      }
      c.restore()

      // HUD readout near plane
      c.save()
      c.font = '10px "IBM Plex Mono", monospace'
      c.fillStyle = 'rgba(232, 163, 58, 0.4)'
      const alt = Math.floor(Math.abs(Math.sin(t * 0.01)) * 38000)
      const spd = Math.floor(Math.abs(Math.cos(t * 0.013)) * 520)
      const hdg = Math.floor(Math.abs(Math.sin(t * 0.007)) * 360)
      c.fillText(`ALT ${alt}ft`, p.x + 40, p.y - 15)
      c.fillText(`SPD ${spd}kt`, p.x + 40, p.y - 2)
      c.fillText(`HDG ${hdg.toString().padStart(3, '0')}°`, p.x + 40, p.y + 11)
      c.fillText(`ERR: VECTOR_UNDEFINED`, p.x + 40, p.y + 28)
      c.restore()
    }

    // ── Vignette ──
    function drawVignette() {
      const grad = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(11,16,24,0.7)')
      c.fillStyle = grad
      c.fillRect(0, 0, w, h)
    }

    // ── Glitch scanlines ──
    function drawScanlines() {
      c.save()
      c.fillStyle = 'rgba(0,0,0,0.03)'
      for (let y = 0; y < h; y += 3) {
        c.fillRect(0, y, w, 1)
      }
      // Occasional glitch line
      if (Math.random() > 0.97) {
        const gy = Math.random() * h
        c.fillStyle = 'rgba(232, 163, 58, 0.04)'
        c.fillRect(0, gy, w, 2 + Math.random() * 3)
      }
      c.restore()
    }

    function tick() {
      raf = requestAnimationFrame(tick)
      t++
      c.clearRect(0, 0, w, h)

      drawGrid()
      drawRadar()
      drawSymbols()
      updatePath()
      drawParticles()
      drawPath()
      drawPlane()
      drawVignette()
      drawScanlines()
    }

    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div className="nf-page">
      <canvas ref={canvasRef} className="nf-canvas" />

      <div className="nf-content">
        <div className="nf-kicker">// FLIGHT CONTROL</div>
        <h1 className="nf-code">
          <span className="nf-digit">4</span>
          <span className="nf-digit nf-digit-glitch">0</span>
          <span className="nf-digit">4</span>
        </h1>
        <div className="nf-divider" />
        <h2 className="nf-title">VECTOR UNDEFINED</h2>
        <p className="nf-sub">
          The flight path you requested does not exist.
          <br />
          Our navigation computer received coordinates that lead nowhere.
        </p>

        <div className="nf-math">
          <span className="nf-math-line">lim<sub>x→∞</sub> P(x) = ∅</span>
          <span className="nf-math-line">∮ ∇×F · dS = 0</span>
          <span className="nf-math-line">ΔV = V<sub>final</sub> − V<sub>initial</sub> = undefined</span>
        </div>

        <div className="nf-actions">
          <a href="/" className="nf-btn nf-btn-primary">
            Return to Base
          </a>
          <a href="/notable-accidents/" className="nf-btn nf-btn-ghost">
            Browse Accidents
          </a>
        </div>

        <div className="nf-status">
          <span className="nf-status-dot" />
          <span>LAST KNOWN POSITION: UNKNOWN · SIGNAL LOST</span>
        </div>
      </div>
    </div>
  )
}
