import React, { useState, useEffect } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import Navbar from './components/Navbar'
import MarketTicker from './components/MarketTicker'
import OceanBackground from './components/OceanBackground'
import ErrorBoundary from './components/ErrorBoundary'
import { setDeepLinkRouteId } from './services/routeStore'

const Home = React.lazy(() => import('./views/Home'))
const Dashboard = React.lazy(() => import('./views/Dashboard'))
const FreightForecaster = React.lazy(() => import('./views/FreightForecaster'))
const CharterOptimizer = React.lazy(() => import('./views/CharterOptimizer'))
const PortRestrictions = React.lazy(() => import('./views/PortRestrictions'))
const RiskRadar = React.lazy(() => import('./views/RiskRadar'))

const views = {
  home: Home,
  dashboard: Dashboard,
  forecaster: FreightForecaster,
  optimizer: CharterOptimizer,
  ports: PortRestrictions,
  risk: RiskRadar,
}

export const VIEW_ORDER = Object.keys(views)

function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [view, routeId] = h.split('/')
  if (routeId) setDeepLinkRouteId(routeId)
  return views[view] ? view : null
}

function writeHash(view) {
  const next = `#/${view}`
  if (window.location.hash !== next) {
    window.history.replaceState(null, '', next)
  }
}

function BootScreen() {
  return (
    <div className="fixed inset-0 bg-[#f2f6fb] flex items-center justify-center z-50">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 justify-center"
        >
          <svg className="w-7 h-7 text-sky-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v18M5 10l7-7 7 7M3 21h18" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.8 2.6 4.2 5.6 4.2 9s-1.4 6.4-4.2 9c-2.8-2.6-4.2-5.6-4.2-9S9.2 5.6 12 3z" />
          </svg>
          <span className="text-xl font-bold text-slate-900 tracking-tight">PortCast</span>
        </motion.div>
        <div className="mt-5 w-44 h-[2px] bg-slate-200 rounded-full overflow-hidden mx-auto">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
            className="h-full w-full bg-gradient-to-r from-sky-600 to-teal-500"
          />
        </div>
        <p className="mt-4 text-xs text-slate-400 font-mono tracking-widest">MARITIME FREIGHT INTELLIGENCE</p>
      </div>
    </div>
  )
}

export default function App() {
  const [activeView, setActiveView] = useState(() => parseHash() || 'home')
  const [isLoading, setIsLoading] = useState(true)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 25 })

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1100)
    if (!window.location.hash) writeHash(activeView)
    const onHash = () => {
      const v = parseHash()
      if (v) setActiveView(v)
      else writeHash(activeView)
    }
    window.addEventListener('hashchange', onHash)
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = document.activeElement?.tagName
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return
      const idx = Number(e.key) - 1
      if (idx >= 0 && idx < VIEW_ORDER.length) setActiveView(VIEW_ORDER[idx])
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ActiveComponent = views[activeView]
  writeHash(activeView)

  if (isLoading) return <BootScreen />

  return (
    <div className="relative min-h-screen">
      {activeView !== 'home' && <OceanBackground />}
      <motion.div className="scroll-progress" style={{ scaleX: progress, transformOrigin: '0% 50%' }} />
      <div className="relative z-10">
        <header className="sticky top-0 z-40">
          <MarketTicker />
          <Navbar activeView={activeView} onViewChange={setActiveView} />
        </header>
        <main key={activeView} className="view-enter">
          <ErrorBoundary key={activeView}>
            <React.Suspense
              fallback={
                <div className="h-96 flex items-center justify-center">
                  <div className="w-7 h-7 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin" />
                </div>
              }
            >
              <ActiveComponent onNavigate={setActiveView} />
            </React.Suspense>
          </ErrorBoundary>
        </main>
        <footer className="border-t border-slate-200 mt-16">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              PortCast — Freight Forecasting & Charter Optimization for India's East Coast
            </p>
            <p className="text-xs font-mono text-slate-400">SIH26006 · Transportation & Logistics</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
