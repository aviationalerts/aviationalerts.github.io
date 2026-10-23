import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './home.css'
import { PillNav } from '../components/PillNav'
import { createHero, type HeroHandle, type Quality } from './heroScene'

const NAV_LINKS = [
  { label: 'Soundboard', href: '/soundboard/' },
  { label: 'Historical Pilots', href: '/Historical-Pilots/' },
  { label: 'Notable Accidents', href: '/notable-accidents/' },
  { label: 'Animations', href: '/animations/' },
]

const QUALITIES: Quality[] = ['high', 'low', 'off']

const PLANE_PATH_D =
  'M41.965 2.029C41.25 1.315 40.42.985 39.502.985c-2.026 0-4.486 1.603-7.123 4.24l-5.119 5.116a.436.436 0 0 0-.229-.128L7.221 6.378a.45.45 0 0 0-.406.125L4.26 9.058a.452.452 0 0 0 .114.723l15.555 7.936c-3.165 3.378-6.789 7.966-9.447 11.852L3.443 28.16a.456.456 0 0 0-.409.123l-1.917 1.918a.451.451 0 0 0 .087.706l6.193 3.735c-.641 1.305-.89 2.222-.581 2.531.09.089.23.132.417.132.457 0 1.187-.257 2.113-.711l3.737 6.193a.46.46 0 0 0 .334.215c.013.001.025.003.038.003l.016-.001h.006c.117 0 .23-.048.314-.133l1.916-1.915a.458.458 0 0 0 .125-.408l-1.409-7.04c3.886-2.656 8.475-6.282 11.853-9.446l7.937 15.554a.456.456 0 0 0 .402.248.458.458 0 0 0 .32-.132l2.556-2.558a.45.45 0 0 0 .125-.404l-3.835-19.811a.438.438 0 0 0-.128-.228l5.116-5.116c3.834-3.834 5.483-7.297 3.196-9.586z'

const ARROW_PATH_D =
  'M1,12.56a1,1,0,0,1-.69-1.72L4.8,6.5.27,1.69A1,1,0,1,1,1.73.31L7.61,6.56,1.69,12.28A1,1,0,0,1,1,12.56Z'

const PICTO_PATH_D =
  'M24.291 10.066l-2.788-.473c-.189-.472-.378-.945-.615-1.417l1.655-2.316a.858.858 0 0 0-.095-1.087l-2.221-2.221a.858.858 0 0 0-1.087-.095l-2.316 1.654c-.425-.236-.898-.472-1.418-.614L14.934.709C14.839.283 14.508 0 14.083 0h-3.166c-.426 0-.804.283-.851.709l-.473 2.788c-.519.189-.992.378-1.465.614L5.813 2.457a.858.858 0 0 0-1.087.095L2.505 4.773A.858.858 0 0 0 2.41 5.86l1.701 2.268c-.236.426-.472.898-.614 1.418l-2.788.473c-.426.094-.709.425-.709.85v3.167c0 .425.283.803.709.85l2.788.473c.189.52.378.992.614 1.465L2.457 19.14a.858.858 0 0 0 .095 1.087l2.221 2.221a.858.858 0 0 0 1.087.094l2.268-1.654c.473.237.946.473 1.465.615l.473 2.788c.094.425.425.709.851.709h3.166c.425 0 .804-.284.851-.709l.472-2.788c.473-.189.946-.378 1.418-.615l2.316 1.654a.858.858 0 0 0 1.087-.094l2.221-2.221a.858.858 0 0 0 .095-1.087l-1.655-2.316c.237-.473.473-.945.615-1.465l2.788-.473c.425-.094.709-.425.709-.85v-3.119c0-.426-.284-.804-.709-.851zm-11.784 8.93c-3.552 0-6.489-2.937-6.489-6.489s2.868-6.49 6.489-6.49c3.62 0 6.489 2.938 6.489 6.49s-2.869 6.489-6.489 6.489z'

function CtaButton() {
  return (
    <a className="btn" href="/soundboard/">
      <span className="bg" />
      <span className="plane-wrapper">
        <svg className="plane-icon visible" viewBox="0 0 45 45" aria-hidden="true">
          <path stroke="#0B2F6A" strokeWidth="2" opacity=".502" fill="none" d={PLANE_PATH_D} />
        </svg>
        <svg className="plane-icon hidden" viewBox="0 0 45 45" aria-hidden="true">
          <path stroke="#0B2F6A" strokeWidth="2" opacity=".502" fill="none" d={PLANE_PATH_D} />
        </svg>
      </span>
      Explore our soundboard
      <svg className="arrow-right plane visible" viewBox="0 0 7.61 12.56" aria-hidden="true">
        <path d={ARROW_PATH_D} />
      </svg>
      <svg className="arrow-right plane hidden" viewBox="0 0 7.61 12.56" aria-hidden="true">
        <path d={ARROW_PATH_D} />
      </svg>
    </a>
  )
}

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const menuRootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)
  const crossRef = useRef<HTMLDivElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLDivElement>(null)
  const bgGroupRef = useRef<HTMLDivElement>(null)
  const fgGroupRef = useRef<HTMLDivElement>(null)
  const bgInnerRef = useRef<HTMLDivElement>(null)
  const fgInnerRef = useRef<HTMLDivElement>(null)
  const mainSwitchRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HeroHandle | null>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [crossOn, setCrossOn] = useState(false)
  const [quality, setQuality] = useState<Quality>('high')

  /* ---------- page chrome: body lock, --vh, mobile class ---------- */
  useEffect(() => {
    const updateVh = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
      document.body.classList.toggle('mobile', window.innerWidth < 768)
    }
    updateVh()
    document.body.style.overflow = 'hidden'
    window.addEventListener('resize', updateVh)
    return () => {
      window.removeEventListener('resize', updateVh)
      document.body.style.overflow = ''
      document.body.classList.remove('mobile')
    }
  }, [])

  /* ---------- webgl bootstrap / contentReady choreography ---------- */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let disposed = false
    let readyFired = false
    const timers: number[] = []

    const staticFallback = () => {
      root.classList.remove('js-webgl-active', 'webgl-ready')
      root.classList.add('static-in')
    }

    const contentReady = () => {
      if (readyFired || disposed) return
      readyFired = true
      timers.push(
        window.setTimeout(() => {
          if (disposed) return
          root.classList.add('home-ready')
          mainSwitchRef.current?.classList.add('active')
        }, 900),
      )
    }

    const desktop = window.innerWidth >= 768
    if (!desktop) {
      staticFallback()
      contentReady()
      return () => {
        disposed = true
        for (const t of timers) window.clearTimeout(t)
      }
    }

    root.classList.add('js-webgl-active')
    const fallbackTimer = window.setTimeout(contentReady, 3500)
    timers.push(fallbackTimer)

    createHero({
      root,
      canvasHost: canvasHostRef.current!,
      buttonEl: btnRef.current!,
      bgGroupEl: bgGroupRef.current!,
      fgGroupEl: fgGroupRef.current!,
      bgInnerEl: bgInnerRef.current!,
      fgInnerEl: fgInnerRef.current!,
    })
      .then((hero) => {
        if (disposed) {
          hero.destroy()
          return
        }
        heroRef.current = hero
        hero.startIntro()
        contentReady()
      })
      .catch(() => {
        if (disposed) return
        staticFallback()
        contentReady()
      })

    return () => {
      disposed = true
      for (const t of timers) window.clearTimeout(t)
      heroRef.current?.destroy()
      heroRef.current = null
    }
  }, [])

  /* ---------- quality switching ---------- */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const hero = heroRef.current
    if (quality === 'off') {
      root.classList.remove('js-webgl-active', 'webgl-ready')
      root.classList.add('static-in')
      hero?.pause()
    } else if (hero) {
      root.classList.add('js-webgl-active')
      root.classList.remove('static-in')
      root.classList.add('webgl-ready')
      hero.setDpr(quality === 'high' ? 1.75 : 1)
      hero.resume()
    }
  }, [quality])

  const onQualityClick = (q: Quality) => {
    if (q === quality) return
    setQuality(q)
    const sw = mainSwitchRef.current
    if (!sw) return
    let next = 40
    for (const o of QUALITIES) {
      const b = sw.querySelector<HTMLButtonElement>(`button[data-quality="${o}"]`)
      if (!b) continue
      if (o === q) b.style.transform = 'translateX(0px)'
      else {
        b.style.transform = `translateX(${next}px)`
        next += 40
      }
    }
  }

  /* ---------- menu: outside click + esc ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const onMenuRootClick = (e: React.MouseEvent) => {
    if (!menuOpen) return
    const t = e.target as Node
    if (panelRef.current?.contains(t)) return
    if (burgerRef.current?.contains(t)) return
    setMenuOpen(false)
  }

  /* ---------- close-cross follows cursor while menu open ---------- */
  useEffect(() => {
    if (!menuOpen) return
    const onMove = (e: PointerEvent) => {
      const cross = crossRef.current
      const panel = panelRef.current
      if (!cross || !panel) return
      const rect = panel.getBoundingClientRect()
      const show = e.clientX <= rect.left - 50
      cross.style.left = `${e.clientX - 25}px`
      cross.style.top = `${e.clientY - 25}px`
      document.body.style.cursor = show ? 'none' : 'auto'
      setCrossOn(show)
    }
    document.addEventListener('pointermove', onMove)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.body.style.cursor = 'auto'
      setCrossOn(false)
    }
  }, [menuOpen])

  return (
    <div className="home-page" ref={rootRef}>
      <header id="header-main" ref={headerRef}>
        <div className="row">
          <div className="columns menu-wrapper">
            <ul className="header-items">
              <li className="header-spacer" />
              <li className="burger-item">
                <div
                  className={menuOpen ? 'main-menu js-active' : 'main-menu'}
                  ref={menuRootRef}
                  onClick={onMenuRootClick}
                >
                  <div
                    className={menuOpen ? 'main-menu-items is-open' : 'main-menu-items'}
                    ref={panelRef}
                  >
                    <div className="main-menu-items-scroll">
                      <ul className="main-menu-items-list">
                        {NAV_LINKS.map((l) => (
                          <li key={l.href}>
                            <a href={l.href}>{l.label}</a>
                          </li>
                        ))}
                      </ul>
                      <div className="menu-bottom-wrapper">
                        <div className="quality-switcher-wrapper active">
                          <span className="menu-mini-title">3D Experience</span>
                          <svg className="picto" viewBox="0 0 25 25" aria-hidden="true">
                            <path fillRule="evenodd" fill="#D0DCE1" d={PICTO_PATH_D} />
                          </svg>
                          <svg className="arrow" viewBox="0 0 10 16" aria-hidden="true">
                            <path
                              stroke="#CDDADF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                              d="M3.374 2.264L7.999 7.5l-4.625 5.236"
                            />
                          </svg>
                          {QUALITIES.map((q) => (
                            <button
                              key={q}
                              data-quality={q}
                              aria-label={`${q} quality`}
                              className={q === quality ? 'active' : ''}
                              onClick={() => onQualityClick(q)}
                            >
                              {q.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={crossOn ? 'close-icon on' : 'close-icon'}
                    ref={crossRef}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="first" />
                    <span className="second" />
                  </div>
                  <button
                    className={
                      menuOpen
                        ? 'burger-menu-btn is-open'
                        : 'burger-menu-btn'
                    }
                    ref={burgerRef}
                    aria-label="Menu"
                    onClick={() => setMenuOpen((o) => !o)}
                  >
                    <span className="background" />
                    <span className="points">
                      <span className={menuOpen ? 'point animate' : 'point'} />
                      <span className="point" />
                      <span className={menuOpen ? 'point animate' : 'point'} />
                    </span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <PillNav />
      </header>

      <div className="scroll-content-wrapper">
        <div className="page-main">
          <header className="page-header">
            <div className="clouds-bg-wrapper block-bg-cover">
              <img
                className="element-cover no-webgl-element"
                src="/clouds/home-clouds-bg.webp"
                alt=""
              />
            </div>
            <div className="clouds-wrapper no-webgl-element">
              <div className="clouds-1">
                <img src="/clouds/home-clouds-fg.webp" alt="" />
              </div>
              <div className="clouds-2">
                <img src="/clouds/home-clouds-fg.webp" alt="" />
              </div>
            </div>
            <div className="airplane-wrapper no-webgl-element">
              <img className="home-airplane" src="/clouds/home.webp" alt="Aviation Alerts aircraft" />
            </div>
            <div className="row">
              <div className="columns title-wrapper">
                <h1>
                  <span className="ht-lines">
                    <span className="ht-line" style={{ '--i': 0 } as CSSProperties}>
                      Aviation Alerts is a leading cockpit
                    </span>
                    <span className="ht-line" style={{ '--i': 1 } as CSSProperties}>
                      warning callout library for simulation.
                    </span>
                  </span>
                  <span className="block-subtitle ht-line" style={{ '--i': 2 } as CSSProperties}>
                    For 66 callouts in the soundboard, click{' '}
                    <a href="/soundboard/">here.</a>
                  </span>
                </h1>
              </div>
            </div>
            <div className="explore-our-fleet-btn-wrapper no-webgl-element active">
              <CtaButton />
            </div>
          </header>
        </div>
      </div>

      {/* WebGL layers — body-level siblings, live-site z-order: gradient 0, clouds 1, plane 90 */}
      <div className="webgl-clouds-group webgl-clouds-bg-group" ref={bgGroupRef}>
        <div className="webGL-clouds-wrapper webgl-clouds-bg" ref={bgInnerRef}>
          <div className="clouds-1">
            <img src="/clouds/home-clouds-bg.webp" alt="" />
          </div>
          <div className="clouds-2">
            <img src="/clouds/home-clouds-bg.webp" alt="" />
          </div>
        </div>
      </div>
      <div className="webGL-wrapper">
        <div className="webGL-container" ref={canvasHostRef} />
      </div>
      <div className="webgl-clouds-group webgl-clouds-fg" ref={fgGroupRef}>
        <div className="webGL-clouds-wrapper" ref={fgInnerRef}>
          <div className="clouds-1">
            <img src="/clouds/home-clouds-fg.webp" alt="" />
          </div>
          <div className="clouds-2">
            <img src="/clouds/home-clouds-fg.webp" alt="" />
          </div>
        </div>
      </div>
      <div className="webGL-Background" />
      <div className="threeHomeButton active" ref={btnRef}>
        <CtaButton />
      </div>

      <div className="quality-switcher-wrapper main-switcher" ref={mainSwitchRef}>
        <svg className="picto" viewBox="0 0 25 25" aria-hidden="true">
          <path fillRule="evenodd" fill="#D0DCE1" d={PICTO_PATH_D} />
        </svg>
        {QUALITIES.map((q) => (
          <button
            key={q}
            data-quality={q}
            aria-label={`${q} quality`}
            className={q === quality ? 'active' : ''}
            onClick={() => onQualityClick(q)}
          >
            {q.toUpperCase()}
          </button>
        ))}
        <svg className="arrow" viewBox="0 0 10 16" aria-hidden="true">
          <path
            stroke="#CDDADF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            d="M3.374 2.264L7.999 7.5l-4.625 5.236"
          />
        </svg>
      </div>
    </div>
  )
}
