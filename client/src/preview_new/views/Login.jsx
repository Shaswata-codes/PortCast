import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Anchor,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Ship,
  Sparkles,
  Compass,
} from 'lucide-react'
import AnimatedCard from '../components/AnimatedCard'
import ScrollReveal from '../components/ScrollReveal'
import BorderBeam from '../components/magic/BorderBeam'
import { loginUser, registerUser } from '../services/api'

export default function Login({ onNavigate, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('Senior Freight Charterer')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your full name')
        if (!email.trim() || !password.trim()) throw new Error('Email and password are required')
        if (password.length < 6) throw new Error('Password must be at least 6 characters')

        const data = await registerUser(name, email, password, role)
        setSuccess(`Welcome aboard, ${data.name}! Account created successfully.`)
        if (onLoginSuccess) onLoginSuccess(data)
        setTimeout(() => {
          if (onNavigate) onNavigate('dashboard')
          else window.location.hash = '#/dashboard'
        }, 800)
      } else {
        if (!email.trim() || !password.trim()) throw new Error('Please enter email and password')
        const data = await loginUser(email, password)
        setSuccess(`Welcome back, ${data.name}!`)
        if (onLoginSuccess) onLoginSuccess(data)
        setTimeout(() => {
          if (onNavigate) onNavigate('dashboard')
          else window.location.hash = '#/dashboard'
        }, 600)
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Authentication failed. Please check credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail, demoPass, demoName, demoRole) => {
    setIsRegister(false)
    setEmail(demoEmail)
    setPassword(demoPass)
    if (demoName) setName(demoName)
    if (demoRole) setRole(demoRole)
    setError(null)
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[360px] bg-gradient-to-tr from-sky-400/10 via-teal-400/10 to-transparent blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        <ScrollReveal>
          {/* Header Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden shadow-xl mb-4 border border-slate-200 bg-white group hover:scale-105 transition-transform">
              <img src="/img/logo.jpg" alt="PortCast Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isRegister ? 'Create PortCast Account' : 'Sign in to PortCast'}
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              AI-Powered Maritime Intelligence & Dry-Bulk Freight Optimization
            </p>
          </div>

          <AnimatedCard className="relative overflow-visible shadow-xl border border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <BorderBeam size={160} duration={7} colorFrom="#0ea5e9" colorTo="#14b8a6" />

            {/* Tab switch */}
            <div className="flex bg-slate-100/80 p-1 rounded-xl mb-6 border border-slate-200/50">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null) }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  !isRegister
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(null) }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  isRegister
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error / Success feedback */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name & Title
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Capt. Alexander Vance"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Role / Organization
                  </label>
                  <div className="relative">
                    <Ship className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    >
                      <option value="Senior Freight Charterer">Senior Freight Charterer</option>
                      <option value="Fleet Operations Manager">Fleet Operations Manager</option>
                      <option value="Commodity Trader (Dry Bulk)">Commodity Trader (Dry Bulk)</option>
                      <option value="Port Logistics Coordinator">Port Logistics Coordinator</option>
                      <option value="Maritime Risk Analyst">Maritime Risk Analyst</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="charterer@portcast.ai"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => fillDemo('demo@portcast.ai', 'password123', 'Capt. Alex Vance')}
                      className="text-[11px] font-medium text-sky-600 hover:text-sky-800"
                    >
                      Auto-fill demo?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isRegister ? 'Create Account & Access Platform' : 'Sign In to Platform'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Access Pills */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                One-Click Demo Credentials
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('demo@portcast.ai', 'password123', 'Capt. Alex Vance', 'Senior Freight Charterer')}
                  className="p-2.5 rounded-lg bg-slate-50 hover:bg-sky-50/70 border border-slate-200/80 hover:border-sky-300 text-left transition-colors group"
                >
                  <p className="text-xs font-bold text-slate-800 group-hover:text-sky-800">
                    Capt. Alex Vance
                  </p>
                  <p className="text-[10px] font-mono text-slate-500">demo@portcast.ai · Chief Charterer</p>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('charterer@portcast.ai', 'password123', 'Priya Sharma', 'East Coast Fleet Operator')}
                  className="p-2.5 rounded-lg bg-slate-50 hover:bg-teal-50/70 border border-slate-200/80 hover:border-teal-300 text-left transition-colors group"
                >
                  <p className="text-xs font-bold text-slate-800 group-hover:text-teal-800">
                    Priya Sharma
                  </p>
                  <p className="text-[10px] font-mono text-slate-500">charterer@portcast.ai · Fleet Operator</p>
                </button>
              </div>
            </div>

            {/* Footer note */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>JWT Encrypted Session · Standalone & Cloud Ready</span>
            </div>
          </AnimatedCard>
        </ScrollReveal>
      </div>
    </div>
  )
}
