import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Radar, AlertTriangle, Activity, ShieldAlert, BarChart3, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import AnimatedCard from '../components/AnimatedCard'
import ScrollReveal from '../components/ScrollReveal'
import ImageCard3D from '../components/ImageCard3D'
import RouteMap from '../components/RouteMap'
import FallbackNotice from '../components/FallbackNotice'
import { disruptionFeed as mockFeed, riskScenarios, severityColors } from '../data/mockData'
import { fetchRoutes, fetchRisk, fetchSimulate, timeAgo, lastError, invalidate } from '../services/api'
import { takeDeepLinkRouteId } from '../services/routeStore'

const FACTOR_COLORS = {
  'Bunker Price': '#d97706',
  'Port Congestion': '#e11d48',
  'Demand Shock': '#059669',
  'Cyclone Disruption': '#7c3aed',
}

function feedFrom(alerts = []) {
  return alerts.slice(0, 9).map((a) => ({
    id: a.id,
    severity: a.severity === 'MODERATE' ? 'MEDIUM' : a.severity,
    title: a.title,
    impact: a.description || a.impact,
    time: timeAgo(a.timestamp) || 'recent',
    affected: (a.affectedRoutes?.length ? a.affectedRoutes : [a.recommendation || a.type]).filter(Boolean),
  }))
}

function parseImpact(str) {
  const m = String(str).match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : 0
}

export default function RiskRadar() {
  const [alerts, setAlerts] = useState(mockFeed)
  const [routesList, setRoutesList] = useState([])
  const [routeId, setRouteId] = useState('')
  const [params, setParams] = useState(
    riskScenarios.reduce((acc, s) => ({ ...acc, [s.id]: s.default }), {})
  )
  const [chokepoint, setChokepoint] = useState(null)
  const [sim, setSim] = useState(null)
  const [rawAlerts, setRawAlerts] = useState([])
  const [riskErr, setRiskErr] = useState(null)
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [regionFilter, setRegionFilter] = useState('ALL')

  useEffect(() => {
    let alive = true
    fetchRisk().then((data) => {
      if (!alive) return
      if (!data) setRiskErr(lastError('risk') || 'unreachable')
      else setRiskErr(null)
      if (data?.alerts?.length) setAlerts(feedFrom(data.alerts))
      if (data?.mlRadar?.alerts) setRawAlerts(data.mlRadar.alerts)
    })
    fetchRoutes().then((data) => {
      if (!alive || !data?.routes?.length) return
      setRoutesList(data.routes)
      const deep = takeDeepLinkRouteId()
      const valid = deep && data.routes.some((r) => r.id === deep) ? deep : null
      setRouteId((cur) => cur || valid || data.routes[0].id)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!routeId) return
    let alive = true
    const scenario = {
      bunkerShockPct: params.bunker,
      congestionExtraDays: params.delay,
      demandShockPct: params.demand,
      cycloneDays: params.cyclone,
      routeClosureChokePoint: chokepoint,
    }
    const t = setTimeout(() => {
      fetchSimulate(routeId, scenario).then((data) => {
        if (alive && data) setSim(data)
      })
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [routeId, params, chokepoint])

  const baseRate = sim?.base?.currentRate ?? sim?.simulated?.adjustments?.reduce((r, a) => r - parseImpact(a.impact), sim?.simulated?.currentRate ?? 0) ?? 14.82
  const simulatedRate = sim?.simulated?.currentRate ?? baseRate
  const delta = simulatedRate - baseRate
  const deltaPercent = baseRate ? ((delta / baseRate) * 100).toFixed(1) : '0.0'

  const adjustments = sim?.simulated?.adjustments || []
  const waterfallData = [
    { name: 'Base', value: Number(baseRate.toFixed(2)), color: '#0369a1' },
    ...adjustments.map((a) => ({
      name: a.factor.replace(' Disruption', '').replace(' Price', ''),
      value: Number(parseImpact(a.impact).toFixed(2)),
      color: FACTOR_COLORS[a.factor] || '#64748b',
    })),
    ...(adjustments.length ? [{ name: 'Simulated', value: Number(simulatedRate.toFixed(2)), color: '#0f172a' }] : []),
  ]

  const handleSliderChange = (id, value) => {
    setParams((prev) => ({ ...prev, [id]: Number(value) }))
  }

  const selectedRoute = routesList.find((r) => r.id === routeId)

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hero */}
      <ScrollReveal>
        <div className="mb-8">
          <div className="absolute -top-6 -left-6 w-80 h-40 bg-gradient-to-br from-rose-500/[0.06] to-amber-500/[0.03] blur-2xl rounded-full pointer-events-none" />
          <p className="section-label mb-3">Geopolitical Risk Intelligence</p>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Risk Radar & <span className="text-gradient">Stress Simulator</span></h1>
          <p className="text-slate-600 max-w-2xl mt-3">Scenario modeling for bunker shocks, congestion, demand shifts and chokepoint closures — quantify exposure before you fix.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="#stress-simulator" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors">
              <Activity className="w-3.5 h-3.5" /> Jump to Simulator
            </a>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> {alerts.length} active alerts
            </span>
          </div>
        </div>
      </ScrollReveal>

      {riskErr && (
        <div className="mb-4"><FallbackNotice
          message={riskErr}
          onRetry={() => { setRiskErr(null); invalidate('risk'); fetchRisk().then((data) => {
            if (data?.alerts?.length) setAlerts(feedFrom(data.alerts))
            if (data?.mlRadar?.alerts) setRawAlerts(data.mlRadar.alerts)
            else setRiskErr(lastError('risk') || 'unreachable')
          }) }}
        /></div>
      )}

      {/* Active Alerts */}
      <ScrollReveal>
        <AnimatedCard shimmer>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mr-auto">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Active Disruption & Geopolitical Alerts
            </h2>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
              {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverityFilter(s)}
                  aria-pressed={severityFilter === s}
                  aria-label={`Filter by ${s} severity`}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    severityFilter === s
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              aria-label="Filter by region"
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {['ALL', 'Hormuz / Persian Gulf', 'Red Sea / Suez', 'Bay of Bengal', 'Malacca Strait', 'Indian Subcontinent', 'East Africa', 'Black Sea'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {alerts
              .filter((a) => severityFilter === 'ALL' || a.severity === severityFilter)
              .filter((a) => {
                if (regionFilter === 'ALL') return true
                const text = `${a.title} ${a.impact || ''} ${(a.affected || []).join(' ')}`.toLowerCase()
                if (regionFilter === 'Hormuz / Persian Gulf') return text.includes('hormuz') || text.includes('persian') || text.includes('gulf')
                if (regionFilter === 'Red Sea / Suez') return text.includes('red sea') || text.includes('suez') || text.includes('bab-el')
                if (regionFilter === 'Bay of Bengal') return text.includes('bay of bengal') || text.includes('bangladesh') || text.includes('cyclone')
                if (regionFilter === 'Malacca Strait') return text.includes('malacca') || text.includes('singapore')
                if (regionFilter === 'Indian Subcontinent') return text.includes('india') || text.includes('paradip') || text.includes('vizag') || text.includes('haldia')
                if (regionFilter === 'East Africa') return text.includes('east africa') || text.includes('djibouti') || text.includes('mozambique')
                if (regionFilter === 'Black Sea') return text.includes('black sea') || text.includes('crimea') || text.includes('odessa')
                return true
              })
              .map((alert, idx) => (
              <motion.div
                key={alert.id}
                initial={{ y: 6 }}
                animate={{ y: 0 }}
                        transition={{ delay: Math.min(idx * 0.06, 0.4) }}
                whileHover={{ scale: 1.015 }}
                className="p-4 rounded-lg bg-white border border-slate-200 hover:border-sky-500/40 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityColors[alert.severity] || severityColors.LOW}`}>
                    {alert.severity}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{alert.time}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2 line-clamp-2">{alert.title}</h3>
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">{alert.impact}</p>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(alert.affected) ? alert.affected : []).slice(0, 2).map((r, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-500 font-mono">
                      {String(r).slice(0, 48)}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
            {alerts.filter((a) => severityFilter === 'ALL' || a.severity === severityFilter)
              .filter((a) => {
                if (regionFilter === 'ALL') return true
                const text = `${a.title} ${a.impact || ''} ${(a.affected || []).join(' ')}`.toLowerCase()
                if (regionFilter === 'Hormuz / Persian Gulf') return text.includes('hormuz') || text.includes('persian') || text.includes('gulf')
                if (regionFilter === 'Red Sea / Suez') return text.includes('red sea') || text.includes('suez') || text.includes('bab-el')
                if (regionFilter === 'Bay of Bengal') return text.includes('bay of bengal') || text.includes('bangladesh') || text.includes('cyclone')
                if (regionFilter === 'Malacca Strait') return text.includes('malacca') || text.includes('singapore')
                if (regionFilter === 'Indian Subcontinent') return text.includes('india') || text.includes('paradip') || text.includes('vizag') || text.includes('haldia')
                if (regionFilter === 'East Africa') return text.includes('east africa') || text.includes('djibouti') || text.includes('mozambique')
                if (regionFilter === 'Black Sea') return text.includes('black sea') || text.includes('crimea') || text.includes('odessa')
                return true
              }).length === 0 && (
              <div className="md:col-span-2 p-8 text-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50">
                <p className="text-sm text-slate-600">No alerts match the current filters.</p>
                <p className="text-xs text-slate-400 mt-1">Try severity <span className="font-mono">ALL</span> or a different region.</p>
              </div>
            )}
          </div>
        </AnimatedCard>
      </ScrollReveal>

      {/* Chokepoint radar map */}
      <ScrollReveal>
        <AnimatedCard beam>
          <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Radar className="w-5 h-5 text-sky-700" />
            Global Chokepoint Radar
          </h2>
          <RouteMap route={null} origins={[]} destinations={[]} radarAlerts={rawAlerts} />
        </AnimatedCard>
      </ScrollReveal>

      {/* Simulator */}
      <div id="stress-simulator" className="grid lg:grid-cols-3 gap-6 scroll-mt-24">
        <ScrollReveal className="lg:col-span-1">
          <AnimatedCard className="h-full">
            <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-700" />
              Scenario Parameters
            </h3>

            <div className="mb-5">
              <label className="text-sm text-slate-600 mb-1.5 block">Route Under Stress</label>
              <select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-sky-500 transition-colors"
              >
                {routesList.map((r) => (
                  <option key={r.id} value={r.id}>{r.originName} → {r.destinationName}</option>
                ))}
              </select>
              {selectedRoute && (
                <p className="text-xs text-slate-400 mt-1.5 font-mono">
                  Spot base: ${Number(selectedRoute.baseFreightRate).toFixed(2)}/MT · {Number(selectedRoute.nauticalMiles).toLocaleString()} NM
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { label: 'Calm market', params: { bunker: 0, delay: 0, demand: 0, cyclone: 0 }, cp: null },
                { label: 'Monsoon worst-case', params: { bunker: 15, delay: 6, demand: 15, cyclone: 8 }, cp: null },
                { label: 'Red Sea crisis', params: { bunker: 25, delay: 4, demand: 0, cyclone: 0 }, cp: 'suez' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  aria-label={`Apply ${preset.label} scenario preset`}
                  onClick={() => { setParams((prev) => ({ ...prev, ...preset.params })); setChokepoint(preset.cp) }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-200 text-slate-600 hover:border-sky-500/50 hover:text-sky-700 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="space-y-5">
              {riskScenarios.map((scenario) => (
                <div key={scenario.id}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">{scenario.label}</span>
                    <span className="num text-sky-700 font-medium">
                      {params[scenario.id] > 0 && scenario.min < 0 ? '+' : ''}{params[scenario.id]}{scenario.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={scenario.label}
                    min={scenario.min}
                    max={scenario.max}
                    step={scenario.step}
                    value={params[scenario.id]}
                    onChange={(e) => handleSliderChange(scenario.id, e.target.value)}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                    style={{ accentColor: '#0284c7' }}
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>{scenario.min}{scenario.unit}</span>
                    <span>{scenario.max}{scenario.unit}</span>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600 mb-3">Chokepoint Closure</p>
                <div className="space-y-2">
                  {[{ id: 'suez', label: 'Suez Canal' }, { id: 'malacca', label: 'Malacca Strait' }].map((point) => (
                    <motion.button
                      key={point.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setChokepoint((cur) => (cur === point.id ? null : point.id))}
                      aria-pressed={chokepoint === point.id}
                      aria-label={`${point.label} chokepoint ${chokepoint === point.id ? 'closure enabled' : 'closure disabled'}`}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                        chokepoint === point.id
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400'
                      }`}
                    >
                      <span className="text-sm font-medium">{point.label}</span>
                      {chokepoint === point.id && <AlertTriangle className="w-4 h-4" />}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedCard>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="lg:col-span-2">
          <AnimatedCard className="h-full">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-700" />
              Simulation Output
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-sky-50 border border-sky-100 text-center">
                <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-mono">Base Rate</p>
                <p className="text-2xl num font-bold text-slate-900">${Number(baseRate).toFixed(2)}</p>
                <p className="text-xs text-slate-400">$/MT</p>
              </div>
              <div className={`p-4 rounded-lg border text-center transition-colors ${delta >= 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-mono">Simulated Rate</p>
                <p className={`text-2xl num font-bold ${delta >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  ${Number(simulatedRate).toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">$/MT</p>
              </div>
              <div className={`p-4 rounded-lg border text-center ${delta >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-mono">Delta Impact</p>
                <p className={`text-2xl num font-bold ${delta >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
                </p>
                <p className={`text-xs num font-medium ${delta >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  ({deltaPercent > 0 && delta >= 0 ? '+' : ''}{deltaPercent}%)
                </p>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <BarChart3 className="w-4 h-4 text-sky-700 shrink-0" />
              <p className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-900">Live simulation</span> · rate = base × (1 + bunker) × (1 + congestion) × (1 + demand){chokepoint ? ' × 1.18 (chokepoint closure)' : ''}. Reset to baseline below.
              </p>
              <button
                type="button"
                onClick={() => {
                  riskScenarios.forEach((s) => handleSliderChange(s.id, 0))
                  setChokepoint(null)
                }}
                className="ml-auto shrink-0 px-3 py-1 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
                aria-label="Reset all scenario sliders to baseline"
              >
                Reset
              </button>
            </div>

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,31,58,0.10)" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} fontFamily="JetBrains Mono" />
                  <YAxis dataKey="name" type="category" stroke="#334155" fontSize={11} width={130} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.97)',
                      border: '1px solid rgba(11,31,58,0.12)',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '12px',
                    }}
                    formatter={(value) => `$${Number(value).toFixed(2)}/MT`}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {waterfallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="text-sky-700 font-semibold">Sensitivity Analysis:</span> Current simulation
                indicates {delta >= 0 ? 'upward' : 'downward'} rate pressure of {Math.abs(deltaPercent)}%
                driven primarily by {params.bunker > 20 ? 'bunker fuel cost shocks' : params.delay > 5 ? 'port congestion delays' : 'baseline market conditions'}.
                {chokepoint ? ` ${chokepoint === 'suez' ? 'Suez Canal' : 'Malacca Strait'} closure adds a rerouting premium (+${chokepoint === 'suez' ? '5.50' : '1.80'}/MT).` : ''}
              </p>
            </div>
          </AnimatedCard>
        </ScrollReveal>
      </div>
    </div>
  )
}
