import { StrictMode, lazy, Suspense, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const HistoricalPilots = lazy(() => import('./pages/HistoricalPilots.tsx'))
const Accidents = lazy(() => import('./pages/Accidents.tsx'))
const AccidentDetail = lazy(() => import('./pages/AccidentDetail.tsx'))
const Animations = lazy(() => import('./pages/Animations.tsx'))
const NotFound = lazy(() => import('./pages/NotFound.tsx'))

const path = window.location.pathname.replace(/\/+$/, '').toLowerCase()

let Page: ReactNode

if (path === '/historical-pilots') {
  Page = <HistoricalPilots />
} else if (path === '/notable-accidents') {
  Page = <Accidents />
} else if (path.startsWith('/notable-accidents/')) {
  const id = path.replace('/notable-accidents/', '')
  Page = <AccidentDetail id={id} />
} else if (path === '/animations') {
  Page = <Animations />
} else if (path === '' || path === '/') {
  Page = <App />
} else {
  Page = <NotFound />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>{Page}</Suspense>
  </StrictMode>,
)
