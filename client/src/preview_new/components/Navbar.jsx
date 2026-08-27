import React from 'react'
import { motion } from 'framer-motion'
import { Home as HomeIcon, Anchor, LayoutDashboard, LineChart, Ship, Building2, Radar } from 'lucide-react'

const navItems = [
  { id: 'home', label: 'Home', icon: HomeIcon, key: '1' },
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, key: '2' },
  { id: 'forecaster', label: 'Forecaster', icon: LineChart, key: '3' },
  { id: 'optimizer', label: 'Optimizer', icon: Ship, key: '4' },
  { id: 'ports', label: 'Ports', icon: Building2, key: '5' },
  { id: 'risk', label: 'Risk Radar', icon: Radar, key: '6' },
]

export default function Navbar({ activeView, onViewChange }) {
  return (
    <nav className="relative w-full bg-white backdrop-blur-xl border-b border-slate-200/70 shadow-sm supports-[backdrop-filter]:bg-white/75">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div
            onClick={() => onViewChange('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center group-hover:bg-sky-600 transition-colors">
              <Anchor className="w-4 h-4 text-white" />
            </div>
            <div className="leading-none">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">PortCast</h1>
              <p className="text-[9px] text-slate-400 font-mono tracking-[0.18em] mt-0.5">FREIGHT INTELLIGENCE</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-current={isActive ? 'page' : undefined}
                  title={`${item.label} — shortcut ${item.key}`}
                  className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                    isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-slate-900 rounded-lg"
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.55 }}
                    />
                  )}
                  <Icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                </motion.button>
              )
            })}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-dot green" />
              <span className="text-[11px] font-mono font-medium text-emerald-700">LIVE</span>
            </div>
            <select
              aria-label="Select view"
              value={activeView}
              onChange={(e) => onViewChange(e.target.value)}
              className="lg:hidden text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800"
            >
              {navItems.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </nav>
  )
}
