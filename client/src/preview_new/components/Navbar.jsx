import React from 'react'
import { motion } from 'framer-motion'
import { Home as HomeIcon, Anchor, LayoutDashboard, LineChart, Ship, Building2, Radar, LogOut } from 'lucide-react'
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'

const navItems = [
  { id: 'home', label: 'Home', icon: HomeIcon, key: '1' },
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, key: '2' },
  { id: 'forecaster', label: 'Forecaster', icon: LineChart, key: '3' },
  { id: 'optimizer', label: 'Optimizer', icon: Ship, key: '4' },
  { id: 'ports', label: 'Ports', icon: Building2, key: '5' },
  { id: 'risk', label: 'Risk Radar', icon: Radar, key: '6' },
]

export default function Navbar({ activeView, onViewChange, userProfile, setUserProfile, user, onLogout }) {
  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential)
      setUserProfile(decoded)

      // Trigger backend email notification
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        await fetch(`${apiBase.replace(/\/$/, '')}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: decoded.name,
            email: decoded.email,
          }),
        });
      } catch (apiErr) {
        console.error('Failed to trigger email notification', apiErr);
      }

    } catch (err) {
      console.error('Error decoding token', err)
    }
  }

  const handleLogout = () => {
    googleLogout()
    setUserProfile(null)
    if (onLogout) onLogout()
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
              <p className="text-[9px] text-slate-500 font-mono tracking-[0.18em] mt-0.5 font-medium">FREIGHT INTELLIGENCE</p>
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
            
            <div className="flex items-center ml-2 border-l border-slate-200 pl-4">
              {userProfile ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <img src={userProfile.picture} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                    <span className="text-sm font-medium text-slate-700 hidden md:block">{userProfile.name}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <GoogleLogin
                  onSuccess={handleLoginSuccess}
                  onError={() => console.error('Login Failed')}
                  shape="pill"
                  size="medium"
                  type="standard"
                  text="signin_with"
                />
              )}
            </div>

            <select
              aria-label="Select view"
              value={activeView}
              onChange={(e) => onViewChange(e.target.value)}
              className="lg:hidden text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 ml-2"
            >
              {navItems.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
              <option value="login">{userProfile || user ? 'Account Profile' : 'Sign In / Register'}</option>
            </select>
          </div>
        </div>
      </div>
    </nav>
  )
}
