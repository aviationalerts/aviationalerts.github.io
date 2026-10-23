import { ArrowUp, Home, Radio, Users, AlertTriangle, Gauge, type LucideIcon } from 'lucide-react'
import { LogoMark } from './LogoMark'

type FooterItem = {
  label: string
  href: string
  icon: LucideIcon
  match: string[]
}

const ITEMS: FooterItem[] = [
  { label: 'Home', href: '/', icon: Home, match: ['/'] },
  { label: 'Soundboard', href: '/soundboard/', icon: Radio, match: ['/soundboard'] },
  { label: 'Pilots', href: '/Historical-Pilots/', icon: Users, match: ['/historical-pilots'] },
  { label: 'Accidents', href: '/notable-accidents/', icon: AlertTriangle, match: ['/notable-accidents'] },
  { label: 'Sim', href: '/cockpit-360/', icon: Gauge, match: ['/cockpit-360'] },
]

function isActive(path: string, item: FooterItem) {
  return item.match.some((m) => (m === '/' ? path === '' : path === m || path.startsWith(m + '/')))
}

export function SiteFooter() {
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '')
  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <a className="site-footer-logo" href="/" aria-label="Aviation Alerts home">
          <LogoMark size={22} />
        </a>
        <span className="site-footer-name">Aviation Alerts</span>
        <span className="site-footer-tag">Cockpit sounds · history · 360</span>
      </div>

      <nav className="site-footer-controls" aria-label="Footer">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(path, item)
          return (
            <a
              key={item.href}
              href={item.href}
              className={active ? 'site-footer-btn is-active' : 'site-footer-btn'}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={13} strokeWidth={2} aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>

      <button
        type="button"
        className="site-footer-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <ArrowUp size={14} strokeWidth={2.25} aria-hidden="true" />
        <span>Top</span>
      </button>
    </footer>
  )
}
