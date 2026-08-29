import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Route, DollarSign, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Clock, Ship, MapPin, Sparkles, Activity, Layers, Compass } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import AnimatedCard from '../components/AnimatedCard'
import ScrollReveal, { RevealItem } from '../components/ScrollReveal'
import ImageCard3D from '../components/ImageCard3D'
import ImageMarquee from '../components/ImageMarquee'
import FallbackNotice from '../components/FallbackNotice'
import NumberTicker from '../components/magic/NumberTicker'
import BorderBeam from '../components/magic/BorderBeam'
import { kpiMetrics as mockKpis, routeProjections as mockRoutes, portStatus as mockPorts, disruptionFeed as mockFeed, signalColors, urgencyColors, severityColors } from '../data/mockData'
import { fetchDashboard, fetchPorts, timeAgo, lastError, invalidate } from '../services/api'

function sparkSeries(dash, key) {
  const hist = dash?.balticHistory || []
  if (!hist.length) return null
  const src = key === 'routes'
    ? (dash?.routeSnapshots || []).map((r) => r.currentRate)
    : hist.slice(-14).map((d) => d[key] ?? d.bdi)
  return src.slice(-14).map((v, i) => ({ i, value: Number(v) || 0 }))
}

function kpiSeries(dash, kpis) {
  if (!dash) return null
  const keys = ['routes', 'bdi', 'bdi', 'alerts']
  return kpis.map((k, idx) => sparkSeries(dash, keys[idx] || 'bdi'))
}

const extraSignalColors = {
  HOLD: 'bg-sky-50 text-sky-700 border-sky-200',
}

function portStatusFrom(destinations) {
  return (destinations || []).slice(0, 5).map((p) => {
    const waitDays = p.avgWaitingDays ?? 0
    const status = waitDays < 3 ? 'Normal' : waitDays < 5 ? 'Elevated' : 'Critical'
    return {
      name: p.name,
      state: p.state,
      waitDays,
      status,
      berths: p.dryBulkBerths,
      dischargeRate: p.avgDischargeRate,
      maxDraft: p.maxDraft,
      maxLOA: p.maxLOA,
    }
  })
}

function routesFrom(snapshots) {
  return (snapshots || []).map((s) => {
    const [origin, destination] = (s.routeName || '').split(' → ')
    const signal = s.signal === 'BUY' ? 'BUY NOW' : s.signal
    return {
      routeId: s.routeId,
      origin,
      destination,
      commodity: s.commodity,
      spotRate: s.currentRate,
      forecast7d: s.forecast7d,
      forecast30d: s.forecast30d,
      direction: s.direction === 'UP' ? 'rising' : s.direction === 'DOWN' ? 'falling' : 'flat',
      signal,
      urgency: s.urgency,
    }
  })
}

function feedFrom(alerts = []) {
  return alerts.slice(0, 8).map((a) => ({
    id: a.id,
    severity: a.severity === 'MODERATE' ? 'MEDIUM' : a.severity,
    title: a.title,
    location: a.type === 'GEOPOLITICAL' ? 'Chokepoint Monitor' : (a.affectedPorts?.[0] || a.type || 'System'),
    impact: a.description || a.impact,
    time: timeAgo(a.timestamp) || 'recent',
    affected: a.affectedRoutes?.length ? a.affectedRoutes : [a.recommendation || a.impact].filter(Boolean),
  }))
}

function kpisFrom(dash) {
  if (!dash) return null
  const snaps = dash.routeSnapshots || []
  const avgSpot = snaps.length ? snaps.reduce((s, r) => s + r.currentRate, 0) / snaps.length : null
  const ups = snaps.filter((r) => r.forecast30d > r.currentRate).length
  const bullish = snaps.length && ups / snaps.length > 0.6
  const alerts = (dash.alerts || []).length

  return [
    { label: 'Active Monitored Routes', value: String(dash.routesCount ?? snaps.length), change: '', trend: 'up', icon: 'Route' },
    {
      label: 'Avg Spot Freight Rate',
      value: avgSpot != null ? `$${avgSpot.toFixed(2)}` : '—',
      change: bullish ? '+4.2%' : '-2.1%',
      trend: bullish ? 'up' : 'down',
      unit: snaps[0] ? '' : '/MT',
      icon: 'DollarSign',
    },
    {
      label: '30-Day Rate Momentum',
      value: bullish ? 'Bullish' : 'Bearish',
      change: `${ups}/${snaps.length} rising`,
      trend: bullish ? 'up' : 'down',
      icon: 'TrendingUp',
    },
    { label: 'Active Risk Alerts', value: String(alerts), change: alerts === 0 ? 'clear' : alerts <= 4 ? `${alerts} LOW` : alerts <= 7 ? `${alerts} MED` : `${alerts} HIGH`, trend: alerts <= 4 ? 'up' : 'down', icon: 'AlertTriangle' },
  ]
}

export default function Dashboard() {
  const [dash, setDash] = useState(null)
  const [portsLive, setPortsLive] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [dashErr, setDashErr] = useState(null)

  const loadDash = (force) => {
    if (force) invalidate('dashboard')
    return fetchDashboard().then((d) => {
      if (!d) { setDashErr(lastError('dashboard') || 'unreachable'); return }
      setDashErr(null)
      setDash(d)
      setUpdatedAt(Date.now())
    })
  }

  const loadPorts = () => fetchPorts().then((p) => {
    if (p && p.destinations?.length) setPortsLive(p.destinations)
  })

  useEffect(() => {
    let alive = true
    loadDash(false)
    loadPorts()
    return () => { alive = false }
  }, [])

  const kpiMetrics = kpisFrom(dash) || mockKpis
  const sparkData = kpiSeries(dash, kpiMetrics)
  const routeProjections = dash?.routeSnapshots?.length ? routesFrom(dash.routeSnapshots) : mockRoutes
  const portStatus = portsLive?.length ? portStatusFrom(portsLive) : mockPorts
  const disruptionFeed = dash?.alerts?.length ? feedFrom(dash.alerts) : mockFeed
  const portChartData = portStatus.map((p) => ({ name: p.name, wait: p.waitDays, capacity: p.capacity }))

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {dashErr && (
        <div className="mb-2">
          <FallbackNotice message={dashErr} onRetry={() => { setDashErr(null); loadDash(true) }} />
        </div>
      )}

      {/* Editorial Hero — Bloomberg / Apple executive styling */}
      <ScrollReveal>
        <div className="relative rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/70 to-sky-50/40 p-6 sm:p-8 lg:p-10 shadow-sm overflow-hidden mb-8">
          <div className="absolute -top-24 -left-20 w-[500px] h-[360px] bg-gradient-to-br from-sky-500/10 via-teal-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />
          <div className="absolute top-10 right-10 w-96 h-96 bg-gradient-to-br from-cyan-500/5 via-sky-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />
          
          <div className="relative grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 shadow-xs mb-5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="text-xs font-semibold text-sky-800 tracking-wide uppercase font-mono">
                    Market Intelligence & Forecasting
                  </span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.08] font-extrabold text-slate-900 tracking-tight">
                  Freight rates,<br />
                  forecast before<br />
                  <span className="text-gradient">they move.</span>
                </h1>
                
                <p className="text-slate-600 text-base sm:text-lg max-w-xl mt-5 leading-relaxed">
                  PortCast predicts dry-bulk freight on India's East Coast and tells you
                  exactly when to fix a charter — vessel, port, and timing included.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200/70 flex flex-wrap items-center gap-2.5 sm:gap-3">
                {[
                  { k: 'Routes Monitored', v: String(dash?.routesCount ?? 20) },
                  { k: 'East Coast Ports', v: '9' },
                  { k: 'Avg Spot Rate', v: `$${(kpiMetrics[1]?.value || '$12.40').replace('$','')}` },
                  { k: 'AI Engine', v: 'Active' },
                ].map((s) => (
                  <div key={s.k} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200 shadow-xs text-xs font-medium text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-500">{s.k}:</span>
                    <b className="text-slate-900 font-semibold">{s.v}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 relative flex justify-center">
              <div className="w-full relative max-w-lg lg:max-w-none">
                <div className="absolute -inset-2 bg-gradient-to-tr from-sky-500/15 to-teal-500/10 blur-xl rounded-2xl pointer-events-none" />
                <ImageCard3D
                  src="/img/hero_port.jpg"
                  alt="Aerial view of bulk carrier at berth"
                  className="h-72 sm:h-80 lg:h-[22rem] w-full rounded-2xl relative shadow-md"
                  caption="Terminal operations — East Coast corridor"
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Scrolling imagery ribbon */}
      <ScrollReveal delay={0.05} className="mb-8">
        <ImageMarquee />
      </ScrollReveal>

      {/* Unified KPI Grid — equal-height, balanced card layout */}
      <ScrollReveal stagger delay={0.05}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpiMetrics.map((kpi, idx) => {
            const isUp = kpi.trend === 'up'
            const numericVal = parseFloat(String(kpi.value).replace(/[^0-9.-]/g, '')) || 0
            const isNumeric = !isNaN(numericVal) && String(kpi.value).match(/[0-9]/)
            return (
              <RevealItem key={kpi.label} className="h-full">
                <AnimatedCard delay={0} hover className="relative overflow-visible h-full flex flex-col justify-between p-5 border border-slate-200/80 shadow-sm">
                  {idx === 1 && <BorderBeam size={120} duration={5} colorFrom="#0ea5e9" colorTo="#06b6d4" />}
                  
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="text-slate-500 text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="truncate">{kpi.label}</span>
                      </p>
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${isUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {kpi.change || (isUp ? '▲' : '▼')}
                      </span>
                    </div>

                    <p className="num text-[30px] leading-tight font-extrabold tracking-tight text-slate-900 flex items-baseline gap-1 mt-1">
                      {isNumeric && numericVal > 0 && numericVal < 1000 ? (
                        <NumberTicker value={numericVal} decimals={String(kpi.value).includes('.') ? 2 : 0} className="kpi-value-gradient" />
                      ) : (
                        <span className={isNumeric ? 'kpi-value-gradient' : ''}>{kpi.value}</span>
                      )}
                      <span className="text-[13px] font-semibold text-slate-500 tracking-normal">{kpi.unit || ''}</span>
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-100 h-12 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparkData?.[idx] || [{ i: 0, value: 1 }, { i: 1, value: 1.08 }, { i: 2, value: 1.02 }]}>
                        <defs>
                          <linearGradient id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="i" hide tickLine={false} axisLine={false} />
                        <YAxis hide domain={['dataMin - 0.02', 'dataMax + 0.02']} />
                        <Area type="monotone" dataKey="value" stroke={isUp ? '#10b981' : '#f43f5e'} strokeWidth={2.2} fill={`url(#grad-${idx})`} dot={false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </AnimatedCard>
              </RevealItem>
            )
          })}
        </div>
      </ScrollReveal>

      {/* Route Projections Table — premium enterprise card */}
      <ScrollReveal delay={0.1}>
        <AnimatedCard className="p-6 border border-slate-200/80 shadow-sm" shimmer beam>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-sky-500" />
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Key Route Projections & Signals</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-3.5">AI-generated freight rate forecasts with booking recommendations</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60 self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{updatedAt ? `Updated ${timeAgo(new Date(updatedAt).toISOString())}` : 'Connecting to engine...'}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/70">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider py-3.5 px-4">Route</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider py-3.5 px-4">Commodity</th>
                  <th className="text-right text-[11px] font-bold uppercase tracking-wider py-3.5 px-4">Spot Rate</th>
                  <th className="text-right text-[11px] font-bold uppercase tracking-wider py-3.5 px-4">7D Forecast</th>
                  <th className="text-right text-[11px] font-bold uppercase tracking-wider py-3.5 px-4">30D Forecast</th>
                  <th className="text-center text-[11px] font-bold uppercase tracking-wider py-3.5 px-4">Direction</th>
                  <th className="text-center text-[11px] font-bold uppercase tracking-wider py-3.5 px-4">Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {routeProjections.map((route, idx) => (
                  <motion.tr
                    key={route.routeId || `${route.origin}-${route.destination}`}
                    initial={{ y: 6 }}
                    animate={{ y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="hover:bg-sky-50/30 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
                          <Ship className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{route.origin}</p>
                          <p className="text-xs text-slate-500 font-medium">{route.destination}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">{route.commodity}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-bold text-slate-900 num font-mono">${route.spotRate.toFixed(2)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`text-sm font-bold num font-mono ${route.forecast7d > route.spotRate ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ${route.forecast7d.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`text-sm font-bold num font-mono ${route.forecast30d > route.spotRate ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ${route.forecast30d.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${route.direction === 'rising' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {route.direction === 'rising' ? <TrendingUp className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {route.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-xs ${signalColors[route.signal] || extraSignalColors[route.signal] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {route.signal}
                        </span>
                        <span className={`text-xs font-bold ${urgencyColors[route.urgency]}`}>
                          {route.urgency}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedCard>
      </ScrollReveal>

      {/* Port Status & Disruption Feed — balanced 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <ScrollReveal delay={0.1} className="h-full">
          <AnimatedCard shimmer className="p-6 h-full flex flex-col justify-between border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-sky-500 to-cyan-400" />
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">East Coast Port Status</h2>
                </div>
                <span className="text-xs font-medium text-slate-500 font-mono">5 Major Terminals</span>
              </div>

              <div className="h-60 mb-6 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={portChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,31,58,0.06)" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={11} fontFamily="JetBrains Mono" />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={85} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(11,31,58,0.12)', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#0b1f3a', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="wait" fill="#0284c7" radius={[0, 4, 4, 0]} name="Wait Days" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                {portStatus.map((port, idx) => (
                  <motion.div
                    key={port.name}
                    initial={{ y: 6 }}
                    animate={{ y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/70 hover:border-slate-300 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        port.status === 'Normal' ? 'bg-emerald-500' :
                        port.status === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'
                      }`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{port.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{port.berths} berths · {port.dischargeRate.toLocaleString()} MT/day discharge</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="num text-sm font-bold text-slate-900 font-mono">{port.waitDays}d wait</p>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        port.status === 'Normal' ? 'bg-emerald-50 text-emerald-700' :
                        port.status === 'Critical' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {port.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </AnimatedCard>
        </ScrollReveal>

        <ScrollReveal delay={0.15} className="h-full">
          <AnimatedCard accent className="p-6 h-full flex flex-col justify-between border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-rose-500 to-amber-500" />
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Live Maritime Disruption Feed</h2>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Live Intel
                </span>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {disruptionFeed.map((alert, idx) => (
                  <motion.div
                    key={alert.id}
                    initial={{ y: 6 }}
                    animate={{ y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.008 }}
                    className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-sky-300 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${severityColors[alert.severity] || severityColors.LOW}`}>
                        {alert.severity}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">{alert.time}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-sky-700 transition-colors leading-snug">
                      {alert.title}
                    </h3>
                    <p className="text-xs text-slate-600 mb-2.5 line-clamp-2 leading-relaxed">{alert.impact}</p>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-medium truncate max-w-[180px]">{alert.location}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {(Array.isArray(alert.affected) ? alert.affected : []).slice(0, 2).map((route, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            {String(route).slice(0, 30)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </AnimatedCard>
        </ScrollReveal>
      </div>
    </div>
  )
}

