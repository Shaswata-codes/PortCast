import React, { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Radar,
  TrendingDown,
  Sparkles,
  Compass,
  Ship,
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  AlertCircle,
  LayoutDashboard,
} from 'lucide-react'
import { loginUser, getStoredUser } from '../services/api'
import FullPageVoyageBackground from '../components/FullPageVoyageBackground'
import ScrollReveal from '../components/ScrollReveal'

const coreEngines = [
  {
    id: 'forecaster',
    title: 'Hybrid ML Freight Forecaster',
    badge: 'LightGBM + Quantile P10/P90',
    description:
      'Predicts dry-bulk freight rates up to 30 days ahead with statistical risk envelopes, trained on 110k+ commodity points and Baltic dry futures.',
    features: ['P10 / P50 / P90 Statistical Bounds', 'Commodity & Bunker Price Lags', 'Baltic Index Momentum Signal'],
    metric: 'R² 0.9997 Accuracy',
  },
  {
    id: 'optimizer',
    title: 'Vessel Charter Optimizer',
    badge: 'Physical Feasibility Engine',
    description:
      'Calculates total voyage economics across Handysize, Supramax, Panamax, and Capesize with automated port draft and Sandheads lighterage checks.',
    features: ['Draft vs DWT Constraint Filter', 'Bunker Burn & Sea Day Matrix', 'Demurrage Risk Minimization'],
    metric: 'Avg $42k Savings / Fixture',
  },
  {
    id: 'risk',
    title: 'Geopolitical & Weather Radar',
    badge: 'Live NLP Shock Factor',
    description:
      'Monitors real-time alerts across global maritime chokepoints (Hormuz, Malacca, Bab-el-Mandeb) and Bay of Bengal monsoon cyclone paths.',
    features: ['Real-Time Maritime News Scraper', 'Chokepoint Vulnerability Scoring', 'Dynamic Freight Surcharge Multiplier'],
    metric: 'Live Chokepoint Defense',
  },
  {
    id: 'ports',
    title: 'East Coast Terminal Matrix',
    badge: 'Port Infrastructure',
    description:
      'Comprehensive physical specifications for India’s East Coast ports: max draft, tidal windows, dry-bulk berths, and discharge rates.',
    features: ['Paradip, Vizag, Haldia, Dhamra', 'Night Navigation Constraints', 'Berth Congestion Wait Tracking'],
    metric: '7 Major Ports Covered',
  },
]

const eastCoastPorts = [
  { name: 'Paradip Port', state: 'Odisha', maxDraft: '16.0m', berths: 16, cargo: 'Thermal Coal, Iron Ore, Coking Coal', highlight: 'Deepwater Capesize Berth' },
  { name: 'Visakhapatnam (Vizag)', state: 'Andhra Pradesh', maxDraft: '18.1m', berths: 24, cargo: 'Coking Coal, Iron Ore Pellets', highlight: 'Natural Outer Harbour' },
  { name: 'Haldia Dock Complex', state: 'West Bengal', maxDraft: '8.5m', berths: 12, cargo: 'Thermal Coal, Manganese, Coke', highlight: 'Sandheads Lighterage Transit' },
  { name: 'Dhamra Port', state: 'Odisha', maxDraft: '18.0m', berths: 5, cargo: 'Thermal Coal, Limestone, Bauxite', highlight: 'Ultra-Deepwater Capesize Terminal' },
  { name: 'Kamarajar (Ennore)', state: 'Tamil Nadu', maxDraft: '15.5m', berths: 8, cargo: 'Thermal Coal for TANGEDCO', highlight: 'Dedicated Coal Conveyor Grid' },
]

export default function Home({ onNavigate, user, onLoginSuccess }) {
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const [loginSuccess, setLoginSuccess] = useState(null)

  const currentUser = user || getStoredUser()

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoginSuccess(null)
    setLoginLoading(true)
    try {
      const data = await loginUser(loginEmail, loginPassword)
      setLoginSuccess(`Welcome, ${data.name}!`)
      if (onLoginSuccess) onLoginSuccess(data)
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || 'Authentication failed')
    } finally {
      setLoginLoading(false)
    }
  }

  const { scrollYProgress } = useScroll()

  // Dynamic telemetry transforms based on scroll progression
  const voyageProgress = useTransform(scrollYProgress, (p) => `${Math.min(100, Math.round(p * 100))}%`)
  const currentSpeed = useTransform(scrollYProgress, [0, 0.35, 0.75, 1], ['6.2 Knots', '14.8 Knots', '13.2 Knots', '4.1 Knots'])
  const activePhase = useTransform(scrollYProgress, [0, 0.35, 0.7, 1], [
    'Berth Exit & Tug Escort',
    'Deep Sea Transit (Bay of Bengal)',
    'Approach & Sandheads Gate',
    'Terminal Mooring & Discharge',
  ])

  const handleNav = (viewId) => {
    if (onNavigate) onNavigate(viewId)
    else window.location.hash = `#/${viewId}`
  }

  // Token glass — uses index.css .glass-card tokens (0.88/blur20/shadow-glass)
  const glassCard = "glass-card glass-card-hover"
  const glassPill = "bg-white/85 backdrop-blur-xl border border-white shadow-sm"

  return (
    <div className="relative min-h-screen text-slate-900 selection:bg-sky-600 selection:text-white pb-24">
      {/* Full-Screen Video / Canvas Background */}
      <FullPageVoyageBackground />

      {/* Foreground Content Container with clean top spacing */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 pt-6 space-y-32 sm:space-y-44">
        
        {/* AIS Telemetry HUD Strip */}
        <div className={`flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 rounded-2xl ${glassPill}`}>
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-800">
              <span className="font-extrabold text-slate-950 tracking-tight">MV SEA GUARDIAN</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-700 font-semibold">Capesize 180k DWT</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-800">
              <span className="text-slate-500 font-medium">Status:</span>
              <motion.span className="text-teal-900 font-bold">{activePhase}</motion.span>
            </div>
            <div className="flex items-center gap-2 text-slate-800">
              <span className="text-slate-500 font-medium">Speed:</span>
              <motion.span className="text-sky-900 font-bold">{currentSpeed}</motion.span>
            </div>
            <div className="flex items-center gap-2 text-slate-800">
              <span className="text-slate-500 font-medium">Destination:</span>
              <span className="text-emerald-900 font-bold">Paradip / Vizag</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500 font-medium">Voyage:</span>
            <motion.span className="text-sky-900 font-extrabold">{voyageProgress}</motion.span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="pt-2">
          <ScrollReveal>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              
              {/* Left Column: Headline & Primary Actions */}
              <div className="lg:col-span-7 space-y-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center px-4 py-1.5 rounded-full ${glassPill} text-sky-950 text-xs font-mono font-bold uppercase tracking-wider`}>
                    SIH26006 · Transportation & Logistics
                  </span>
                  <span className={`inline-flex items-center px-4 py-1.5 rounded-full ${glassPill} text-slate-800 text-xs font-mono font-semibold`}>
                    India East Coast Maritime Corridor
                  </span>
                </div>

                <div className="inline-block">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08] [text-shadow:0_2px_18px_rgba(255,255,255,0.78),0_1px_3px_rgba(255,255,255,0.92)]">
                    Predict Freight. <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-700 via-teal-700 to-emerald-700 [text-shadow:none]">
                      Optimize Chartering.
                    </span> <br />
                    <span className="text-slate-900">Move Cargo Smarter.</span>
                  </h1>
                  <div className="mt-4 inline-block rounded-xl bg-white/75 backdrop-blur-md border border-white/90 shadow-sm px-4 py-2.5">
                    <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-normal">
                      PortCast combines statistical time-series machine learning with real-time geopolitical intelligence and physical port draft physics to optimize vessel chartering on India’s East Coast.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3.5 pt-1">
                  <button
                    onClick={() => handleNav('dashboard')}
                    className="px-7 py-3.5 rounded-xl bg-slate-900/95 hover:bg-slate-900 text-white font-semibold text-sm transition-all shadow-xl hover:shadow-2xl flex items-center gap-2.5 active:scale-95 group backdrop-blur-md"
                  >
                    <span>Launch Market Overview</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => handleNav('forecaster')}
                    className={`px-7 py-3.5 rounded-xl ${glassCard} text-slate-900 font-bold text-sm flex items-center gap-2`}
                  >
                    <span>Freight Rate Forecaster</span>
                  </button>
                </div>

                {/* Glassmorphic Value Metrics Strip */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/60">
                  <div className={`p-4 sm:p-5 rounded-2xl ${glassCard}`}>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-sky-950 font-mono">0.9997</p>
                    <p className="text-[11px] sm:text-xs text-slate-700 font-semibold mt-1">LightGBM Model R²</p>
                  </div>
                  <div className={`p-4 sm:p-5 rounded-2xl ${glassCard}`}>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-teal-950 font-mono">14.2%</p>
                    <p className="text-[11px] sm:text-xs text-slate-700 font-semibold mt-1">Avg Charter Savings</p>
                  </div>
                  <div className={`p-4 sm:p-5 rounded-2xl ${glassCard}`}>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-950 font-mono">30 Days</p>
                    <p className="text-[11px] sm:text-xs text-slate-700 font-semibold mt-1">Predictive Horizon</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Login Card */}
              <div className="lg:col-span-5">
                <div className={`p-6 sm:p-7 rounded-3xl ${glassCard} border border-white/95 shadow-2xl relative overflow-hidden space-y-5 bg-white/90 backdrop-blur-2xl`}>
                  {/* Subtle top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-600 via-teal-500 to-emerald-500" />

                  {currentUser ? (
                    /* Authenticated State View */
                    <div className="space-y-5 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-700 to-teal-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                            {currentUser.name ? currentUser.name.split(' ').map(p => p[0]).join('').slice(0, 2) : 'U'}
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-slate-900 leading-tight">{currentUser.name}</h2>
                            <p className="text-xs text-sky-700 font-mono font-semibold">{currentUser.role || 'Senior Freight Charterer'}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold text-emerald-700">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          VERIFIED
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-mono space-y-1.5">
                        <div className="flex justify-between text-slate-600">
                          <span>Account Email:</span>
                          <span className="font-bold text-slate-900">{currentUser.email}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Security Status:</span>
                          <span className="text-emerald-700 font-bold">JWT Session Encrypted</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleNav('dashboard')}
                          className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          <span>Overview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNav('forecaster')}
                          className="px-4 py-3 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                        >
                          <Compass className="w-4 h-4" />
                          <span>Forecaster</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Login Form View */
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                          <Lock className="w-4 h-4 text-sky-400" />
                        </div>
                        <div>
                          <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">Charterer Sign In</h2>
                          <p className="text-[11px] text-slate-600 font-mono">Enterprise Terminal Access</p>
                        </div>
                      </div>

                      {loginError && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span className="font-medium">{loginError}</span>
                        </div>
                      )}

                      {loginSuccess && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span className="font-medium">{loginSuccess}</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email</label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              required
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              placeholder="name@portcast.ai"
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            >
                              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-60"
                      >
                        {loginLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Authenticating...</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            <span>Sign In to Terminal</span>
                          </>
                        )}
                      </button>

                      {/* 1-Click Demo Accounts */}
                      <div className="pt-2 border-t border-slate-200/80">
                        <p className="text-[10px] text-slate-500 font-mono font-medium mb-1.5 uppercase tracking-wider">One-Click Demo Credentials:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLoginEmail('demo@portcast.ai')
                              setLoginPassword('password123')
                              setLoginError(null)
                            }}
                            className="p-2 rounded-xl bg-slate-100/90 hover:bg-sky-50 hover:border-sky-300 border border-slate-200 text-left transition-all group"
                          >
                            <p className="text-[11px] font-bold text-slate-900 group-hover:text-sky-900">Capt. Alex</p>
                            <p className="text-[9px] text-slate-500 font-mono">Senior Charterer</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLoginEmail('charterer@portcast.ai')
                              setLoginPassword('password123')
                              setLoginError(null)
                            }}
                            className="p-2 rounded-xl bg-slate-100/90 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 text-left transition-all group"
                          >
                            <p className="text-[11px] font-bold text-slate-900 group-hover:text-teal-900">Priya Sharma</p>
                            <p className="text-[9px] text-slate-500 font-mono">Fleet Operator</p>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>

            </div>
          </ScrollReveal>
        </section>

        {/* Narrative Voyage Chapters as User Scrolls */}
        <section className="space-y-12">
          <ScrollReveal>
            <div className="flex items-center justify-between border-b border-white/50 pb-5">
              <span className="text-xs font-mono uppercase tracking-widest text-sky-900 font-extrabold">
                Voyage Execution Timeline
              </span>
              <span className="text-xs text-slate-700 font-mono font-medium">Scroll down to scrub the journey</span>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            <div className={`p-8 rounded-3xl ${glassCard} group`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-mono text-sky-900 font-bold uppercase tracking-wider px-3 py-1 rounded-lg ${glassPill}`}>
                  Chapter 01
                </span>
                <span className="text-xs font-mono text-slate-600 font-medium">Paradip / Haldia</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-950 mt-3">Sandheads Tidal Gate Sync</h3>
              <p className="text-sm text-slate-700 mt-3 leading-relaxed font-normal">
                Automated draft constraints cross-reference Sandheads 8.5m tidal window to eliminate costly grounding risks and avoid Sandheads lighterage penalties.
              </p>
            </div>

            <div className={`p-8 rounded-3xl ${glassCard} group`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-mono text-teal-900 font-bold uppercase tracking-wider px-3 py-1 rounded-lg ${glassPill}`}>
                  Chapter 02
                </span>
                <span className="text-xs font-mono text-slate-600 font-medium">Bay of Bengal</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-950 mt-3">Weather & Fuel Routing</h3>
              <p className="text-sm text-slate-700 mt-3 leading-relaxed font-normal">
                Calculates dynamic bunker fuel burn against Southwest & Northeast monsoon swell vectors, optimizing transit speeds for maximum fuel economy.
              </p>
            </div>

            <div className={`p-8 rounded-3xl ${glassCard} group`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-mono text-emerald-900 font-bold uppercase tracking-wider px-3 py-1 rounded-lg ${glassPill}`}>
                  Chapter 03
                </span>
                <span className="text-xs font-mono text-slate-600 font-medium">Destination Fixture</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-950 mt-3">Optimal Fixture Lock-In</h3>
              <p className="text-sm text-slate-700 mt-3 leading-relaxed font-normal">
                Ranks Handysize, Supramax, Panamax, and Capesize by effective $/MT cost and locks laycan windows before forward freight price surges occur.
              </p>
            </div>
          </div>
        </section>

        {/* 4 Core Intelligence Engines Grid */}
        <section className="space-y-12">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/50 pb-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-sky-900 font-extrabold">
                  Modular Intelligence System
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-1 tracking-tight">
                  Engineered for High-Value Bulk Logistics
                </h2>
              </div>
              <p className="text-sm text-slate-700 max-w-md font-medium">
                Every calculation engine works synchronously to ensure physical vessel feasibility and commercial cost minimization.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8">
            {coreEngines.map((engine) => {
              return (
                <div
                  key={engine.id}
                  className={`p-8 sm:p-10 rounded-3xl ${glassCard} flex flex-col justify-between group`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xs font-mono font-bold px-3.5 py-1.5 rounded-full ${glassPill} text-sky-950`}>
                        {engine.badge}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-950 group-hover:text-sky-900 transition-colors">
                      {engine.title}
                    </h3>
                    <p className="text-slate-700 text-sm mt-3 leading-relaxed font-normal">
                      {engine.description}
                    </p>

                    <div className="mt-8 space-y-3">
                      {engine.features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-slate-800 font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-white/50 flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold text-sky-950 px-3.5 py-1.5 rounded-lg ${glassPill}`}>
                      {engine.metric}
                    </span>
                    <button
                      onClick={() => handleNav(engine.id)}
                      className="text-xs font-bold text-sky-900 hover:text-sky-950 flex items-center gap-1.5 group-hover:translate-x-1 transition-transform"
                    >
                      <span>Open Engine</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* East Coast Corridor Profiles */}
        <section className="space-y-12">
          <ScrollReveal>
            <div className="border-b border-white/50 pb-6">
              <span className="text-xs font-mono uppercase tracking-wider text-teal-900 font-extrabold">
                Strategic Seaport Network
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-1 tracking-tight">
                East Coast India Port Coverage
              </h2>
              <p className="text-sm text-slate-700 mt-1 font-medium">
                Real-time physical specifications and cargo handling profiles powering PortCast’s charter constraint solver.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {eastCoastPorts.map((port) => (
              <div
                key={port.name}
                className={`p-7 rounded-3xl ${glassCard}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-slate-950">{port.name}</h4>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">{port.state}</p>
                  </div>
                  <span className={`text-xs font-mono font-bold text-sky-950 px-3 py-1 rounded-md ${glassPill}`}>
                    {port.maxDraft} Draft
                  </span>
                </div>

                <div className="mt-5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-700 border-b border-white/40 pb-2">
                    <span className="text-slate-500 font-medium">Dry Bulk Berths</span>
                    <span className="font-bold text-slate-950">{port.berths} Berths</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 border-b border-white/40 pb-2">
                    <span className="text-slate-500 font-medium">Primary Cargo</span>
                    <span className="font-semibold text-slate-950 text-right truncate max-w-[170px]">{port.cargo}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 pt-0.5">
                    <span className="text-slate-500 font-medium">Key Spec</span>
                    <span className="text-teal-900 font-bold">{port.highlight}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Quick Link Card to full matrix */}
            <div
              onClick={() => handleNav('ports')}
              className={`p-7 rounded-3xl ${glassCard} cursor-pointer flex flex-col items-center justify-center text-center group`}
            >
              <h4 className="text-base font-bold text-slate-950 group-hover:text-sky-900">View Full Compliance Matrix</h4>
              <p className="text-xs text-slate-700 mt-2 max-w-[220px] font-medium">Inspect LOA, Beam, tidal limits, and Sandheads barge specs</p>
              <span className="mt-4 text-xs font-bold text-sky-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Open Ports Matrix <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner (Translucent Light Glass) */}
        <section className="pb-16">
          <ScrollReveal>
            <div className={`relative rounded-3xl ${glassCard} p-8 sm:p-14 overflow-hidden`}>
              <div className="relative z-10 max-w-2xl">
                <span className={`text-xs font-mono uppercase tracking-widest text-sky-950 font-extrabold px-4 py-1.5 rounded-full ${glassPill}`}>
                  Decision Co-Pilot
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-6 text-slate-950">
                  Ready to optimize your next East Coast charter fixture?
                </h2>
                <p className="text-slate-700 text-sm sm:text-base mt-3 leading-relaxed font-normal">
                  Run a live simulation across 5 major routes, test fuel price shocks, or calculate demurrage risks for upcoming voyages.
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-8">
                  <button
                    onClick={() => handleNav('optimizer')}
                    className="px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white font-semibold text-sm transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center gap-2"
                  >
                    <span>Start Charter Optimization</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleNav('risk')}
                    className={`px-8 py-4 rounded-xl ${glassPill} hover:bg-white/[0.45] text-slate-900 font-bold text-sm transition-all flex items-center gap-2`}
                  >
                    <span>Run What-If Simulation</span>
                  </button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </div>
    </div>
  )
}
