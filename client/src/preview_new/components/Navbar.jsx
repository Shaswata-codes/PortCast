import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home as HomeIcon,
  Anchor,
  LayoutDashboard,
  LineChart,
  Ship,
  Building2,
  Radar,
  User as UserIcon,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react'
import { logoutUser, getStoredUser } from '../services/api'

const navItems = [
  { id: 'home', label: 'Home', icon: HomeIcon, key: '1' },
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, key: '2' },
  { id: 'forecaster', label: 'Forecaster', icon: LineChart, key: '3' },
  { id: 'optimizer', label: 'Optimizer', icon: Ship, key: '4' },
  { id: 'ports', label: 'Ports', icon: Building2, key: '5' },
  { id: 'risk', label: 'Risk Radar', icon: Radar, key: '6' },
]

export default function Navbar({ activeView, onViewChange, user, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const currentUser = user || getStoredUser()

  React.useEffect(() => {
    if (!dropdownOpen) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('#user-profile-menu')) {
        setDropdownOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dropdownOpen])

  const handleLogout = () => {
    logoutUser()
    setDropdownOpen(false)
    if (onLogout) onLogout()
    onViewChange('home')
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('')
  }

  return (
    <nav className="relative w-full bg-white backdrop-blur-xl border-b border-slate-200/70 shadow-sm supports-[backdrop-filter]:bg-white/75">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div
            onClick={() => onViewChange('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-white group-hover:scale-105 transition-transform">
              <img src="/img/logo.jpg" alt="PortCast Logo" className="w-full h-full object-cover" />
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
            {/* User Profile or Sign In Button */}
            {currentUser ? (
              <div id="user-profile-menu" className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-slate-100 transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    {getInitials(currentUser.name)}
                  </div>
                  <div className="hidden sm:block leading-tight">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[130px]">
                      {currentUser.name}
                    </p>
                    <p className="text-[9px] font-mono text-slate-400">
                      {currentUser.role || 'Charterer'}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                        <p className="text-[10px] font-mono text-slate-500 truncate">{currentUser.email}</p>
                        <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                          <ShieldCheck className="w-2.5 h-2.5 text-sky-600" />
                          Authenticated
                        </span>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => { setDropdownOpen(false); onViewChange('dashboard') }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                          Dashboard Overview
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDropdownOpen(false); onViewChange('optimizer') }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Ship className="w-3.5 h-3.5 text-slate-400" />
                          Charter Optimizer
                        </button>
                      </div>
                      <div className="border-t border-slate-100 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onViewChange('login')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            <select
              aria-label="Select view"
              value={activeView}
              onChange={(e) => onViewChange(e.target.value)}
              className="lg:hidden text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800"
            >
              {navItems.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
              <option value="login">{currentUser ? 'Account Profile' : 'Sign In / Register'}</option>
            </select>
          </div>
        </div>
      </div>
    </nav>
  )
}
