import { Fragment } from 'react'
import { Home, Radio, Users, AlertTriangle, Gauge, type LucideIcon } from 'lucide-react'
import { LogoMark } from './LogoMark'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  match: string[]
}

const ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: Home, match: ['/'] },
  { label: 'Soundboard', href: '/soundboard/', icon: Radio, match: ['/soundboard'] },
  { label: 'Pilots', href: '/Historical-Pilots/', icon: Users, match: ['/historical-pilots'] },
  { label: 'Accidents', href: '/notable-accidents/', icon: AlertTriangle, match: ['/notable-accidents'] },
  { label: 'Sim', href: '/cockpit-360/', icon: Gauge, match: ['/cockpit-360'] },
]

function isActive(path: string, item: NavItem) {
  return item.match.some((m) => (m === '/' ? path === '' : path === m || path.startsWith(m + '/')))
}

export function PillNav() {
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '')
  return (
    <div className="pill-nav-wrap">
      <nav className="pill-nav" aria-label="Primary">
        <ul className="pill-nav-items">
          {ITEMS.map((item, i) => {
            const Icon = item.icon
            const active = isActive(path, item)
            return (
              <Fragment key={item.href}>
                <li>
                  <a
                    href={item.href}
                    className={active ? 'pill-nav-link is-active' : 'pill-nav-link'}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={15} strokeWidth={2} aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                </li>
                {i === 2 && (
                  <li>
                    <a
                      className="pill-nav-brand"
                      href="/"
                      aria-label="Aviation Alerts home"
                    >
                      <LogoMark size={24} />
                    </a>
                  </li>
                )}
              </Fragment>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
