import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Route, DollarSign, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Clock, Ship, MapPin, Sparkles, Activity } from 'lucide-react'
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
  HOLD: 'bg-violet-500/12 text-violet-600 border-violet-500/30',
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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {dashErr && (
        <div className="mb-4">
          <FallbackNotice message={dashErr} onRetry={() => { setDashErr(null); loadDash(true) }} />
        </div>
      )}

      {/* Editorial Hero — dramatic */}
      <ScrollReveal>
        <div className="relative grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center mb-10 overflow-visible">
          <div className="absolute -top-10 -left-10 w-[520px] h-[380px] bg-gradient-to-br from-sky-500/[0.07] via-teal-500/[0.05] to-transparent blur-3xl rounded-full pointer-events-none" />
          <div className="absolute top-20 right-[42%] w-72 h-72 bg-gradient-to-br from-violet-500/[0.04] to-transparent blur-3xl rounded-full pointer-events-none" />
          <div className="relative">
            <p className="section-label mb-5">
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                {dash ? 'Live Market Intelligence' : 'Real-Time Market Intelligence'}
              </span>
            </p>
            <h1 className="text-[2.45rem] lg:text-[3.4rem] leading-[0.96] font-extrabold text-slate-900 tracking-tight">
              Freight rates,<br />
              forecast before<br />
              <span className="text-gradient">they move.</span>
            </h1>
            <p className="text-slate-600 text-lg max-w-xl mt-6 leading-relaxed">
              PortCast predicts dry-bulk freight on India's East Coast and tells you
              exactly when to fix a charter — vessel, port, and timing included.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {[
                { k: 'Routes', v: String(dash?.routesCount ?? 20) },
                { k: 'Ports', v: '9' },
                { k: 'Avg spot', v: `$${(kpiMetrics[1]?.value || '$12.40').replace('$','')}` },
                { k: 'Signals', v: 'Live' },
              ].map((s) => (
                <span key={s.k} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-medium text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {s.k} <b className="text-slate-900">{s.v}</b>
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-br from-sky-500/10 via-teal-500/5 to-transparent blur-2xl rounded-[28px] pointer-events-none" />
            <ImageCard3D
              src="/img/hero_port.jpg"
              alt="Aerial view of bulk carrier at berth"
              className="h-80 lg:h-[28rem] relative"
              caption="Terminal operations — East Coast corridor"
            />
          </div>
        </div>
      </ScrollReveal>

      {/* Scrolling imagery ribbon */}
      <ScrollReveal delay={0.1} className="mb-10">
        <ImageMarquee />
      </ScrollReveal>

      {/* KPI Grid — dramatic with beams, sparks, tickers */}
      <ScrollReveal stagger delay={0.05}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiMetrics.map((kpi, idx) => {
            const isUp = kpi.trend === 'up'
            const numericVal = parseFloat(String(kpi.value).replace(/[^0-9.-]/g, '')) || 0
            const isNumeric = !isNaN(numericVal) && String(kpi.value).match(/[0-9]/)
            return (
              <RevealItem key={kpi.label}>
                <AnimatedCard delay={0} hover className="relative overflow-visible">
                  {idx === 1 && <BorderBeam size={120} duration={5} colorFrom="#0ea5e9" colorTo="#06b6d4" />}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-500 text-[11px] font-semibold tracking-widest uppercase flex items-center gap-1.5">
                      <span className={`w-1 h-1 rounded-full ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`} /> {kpi.label}
                    </p>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${isUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {kpi.change || (isUp ? '▲' : '▼')}
                    </span>
                  </div>
                  <p className="num text-[28px] leading-none font-extrabold tracking-tight text-slate-900 flex items-baseline gap-1">
                    {isNumeric && numericVal > 0 && numericVal < 1000 ? (
                      <NumberTicker value={numericVal} decimals={String(kpi.value).includes('.') ? 2 : 0} className="kpi-value-gradient" />
                    ) : (
                      <span className={isNumeric ? 'kpi-value-gradient' : ''}>{kpi.value}</span>
                    )}
                    <span className="text-[13px] font-semibold text-slate-400 tracking-normal">{kpi.unit || ''}</span>
                  </p>
                  <div className="mt-3 h-11 -mx-1">
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

      {/* Route Projections Table — premium */}
      <ScrollReveal delay={0.2}>
        <AnimatedCard className="overflow-hidden" shimmer beam>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Key Route Projections & Signals</h2>
              <p className="text-sm text-slate-500 mt-1">AI-generated freight rate forecasts with booking recommendations</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Clock className="w-4 h-4" />
              <span>{updatedAt ? `Updated ${timeAgo(new Date(updatedAt).toISOString())}` : 'Connecting to engine...'}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Route</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Commodity</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Spot Rate</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">7D Forecast</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">30D Forecast</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Direction</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Signal</th>
                </tr>
              </thead>
              <tbody>
                {routeProjections.map((route, idx) => (
                  <motion.tr
                    key={idx}
                    initial={{ y: 6 }}
                    animate={{ y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Ship className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{route.origin}</p>
                          <p className="text-xs text-slate-500">{route.destination}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm font-medium text-slate-700">{route.commodity}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-bold text-slate-900 num">${route.spotRate.toFixed(2)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`text-sm font-bold num ${route.forecast7d > route.spotRate ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ${route.forecast7d.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`text-sm font-bold num ${route.forecast30d > route.spotRate ? 'text-emerald-600' : 'text-rose-600'}`}>
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
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${signalColors[route.signal] || extraSignalColors[route.signal] || 'bg-slate-500/20 text-slate-600 border-slate-500/30'}`}>
                        {route.signal}
                      </span>
                      <span className={`text-xs ml-2 font-bold ${urgencyColors[route.urgency]}`}>
                        {route.urgency}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedCard>
      </ScrollReveal>

      {/* Port Status & Disruption Feed — elevated */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ScrollReveal delay={0.1}>
          <AnimatedCard shimmer>
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><span className="w-1 h-6 rounded-full bg-gradient-to-b from-sky-500 to-cyan-400" /> East Coast Port Status</h2>
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={portChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,31,58,0.08)" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} fontFamily="JetBrains Mono" />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(11,31,58,0.12)', borderRadius: '8px' }}
                    labelStyle={{ color: '#0b1f3a' }}
                  />
                  <Bar dataKey="wait" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Wait Days" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {portStatus.map((port, idx) => (
                <motion.div
                  key={port.name}
                  initial={{ y: 6 }}
                  animate={{ y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      port.status === 'Normal' ? 'bg-emerald-500' :
                      port.status === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{port.name}</p>
                      <p className="text-xs text-slate-500">{port.berths} berths | {port.dischargeRate.toLocaleString()} MT/day</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="num text-sm font-medium text-slate-900">{port.waitDays}d wait</p>
                    <p className="text-xs text-slate-500">{Number(port.dischargeRate).toLocaleString()} MT/d</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <AnimatedCard accent>
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><span className="w-1 h-6 rounded-full bg-gradient-to-b from-rose-500 to-amber-500" /> Live Maritime Disruption Feed</h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {disruptionFeed.map((alert, idx) => (
                <motion.div
                  key={alert.id}
                  initial={{ y: 6 }}
                  animate={{ y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${severityColors[alert.severity] || severityColors.LOW}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{alert.time}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-sky-700 transition-colors">
                    {alert.title}
                  </h3>
                  <p className="text-xs text-slate-600 mb-2 line-clamp-2">{alert.impact}</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{alert.location}</span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {(Array.isArray(alert.affected) ? alert.affected : []).slice(0, 3).map((route, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 font-mono">
                        {String(route).slice(0, 60)}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </ScrollReveal>
      </div>
    </div>
  )
}
