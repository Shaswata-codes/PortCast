import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Brain, Clock, Activity, BarChart3, Target, AlertCircle, Download, Sliders, Award } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, BarChart, Bar, Cell, LabelList } from 'recharts'
import AnimatedCard from '../components/AnimatedCard'
import ScrollReveal from '../components/ScrollReveal'
import ImageCard3D from '../components/ImageCard3D'
import { generateForecastData as mockForecastData, modelPerformance, signalColors } from '../data/mockData'
import BookingStrip from '../components/BookingStrip'
import FallbackNotice from '../components/FallbackNotice'
import RouteMap from '../components/RouteMap'
import ExplainabilityPanel from '../components/ExplainabilityPanel'
import { fetchRoutes, fetchForecast, fetchPorts, fetchRisk, lastError, invalidate } from '../services/api'
import { takeDeepLinkRouteId } from '../services/routeStore'

const fallbackSignalColors = {
  HOLD: 'bg-violet-500/12 text-violet-600 border-violet-500/30',
}

function buildChartData(forecast, mlEngine) {
  const hist = (forecast?.historical || []).map((d) => ({
    date: d.date,
    rate: d.rate,
    p10: null,
    p90: null,
    type: 'historical',
  }))
  const traj = mlEngine?.trajectory_30d
  let points = []
  if (Array.isArray(traj) && traj.length) {
    const today = new Date()
    points = traj.map((t) => {
      const d = new Date(today)
      d.setDate(d.getDate() + t.day)
      return {
        date: d.toISOString().split('T')[0],
        rate: Number(t.expected_rate.toFixed(2)),
        p10: Number(t.p10_lower.toFixed(2)),
        p90: Number(t.p90_upper.toFixed(2)),
        type: 'forecast',
      }
    })
  } else if (forecast?.forecasts) {
    const f = forecast.forecasts
    const anchors = [7, 15, 30].filter((h) => f[h])
    const today = new Date()
    const lastRate = forecast.currentRate || hist[hist.length - 1]?.rate || 14
    points = anchors.map((h, i) => ({
      date: (() => { const d = new Date(today); d.setDate(d.getDate() + h); return d.toISOString().split('T')[0] })(),
      rate: f[h].pointForecast,
      p10: f[h].ci80.low,
      p90: Math.max(f[h].ci80.high, f[h].pointForecast * 1.05),
      type: 'forecast',
      _anchorIdx: i,
    }))
    // bridge from last historical value to first anchor so the line is continuous
    if (points.length && hist.length) {
      const first = points[0]
      const midDate = new Date(today)
      midDate.setDate(midDate.getDate() + 3)
      points.unshift({
        date: midDate.toISOString().split('T')[0],
        rate: Number(((lastRate + first.rate) / 2).toFixed(2)),
        p10: Number((first.p10 * 0.99).toFixed(2)),
        p90: Number((first.p90 * 1.01).toFixed(2)),
        type: 'forecast',
      })
    }
  }
  return [...hist, ...points]
}

export default function FreightForecaster() {
  const [routesList, setRoutesList] = useState([])
  const [selectedRouteId, setSelectedRouteId] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [portsData, setPortsData] = useState({ origins: [], destinations: [] })
  const [radarAlerts, setRadarAlerts] = useState([])
  const [radarAge, setRadarAge] = useState('')
  const [bookingTarget, setBookingTarget] = useState(null)
  const [fcErr, setFcErr] = useState(null)
  const [retryTick, setRetryTick] = useState(0)
  const [whatIf, setWhatIf] = useState({ bunker: 0, congestion: 0, demand: 0 })
  const [parcelMT, setParcelMT] = useState(75000)

  useEffect(() => {
    let alive = true
    fetchRoutes().then((data) => {
      if (!alive || !data?.routes?.length) return
      setRoutesList(data.routes)
      const deep = takeDeepLinkRouteId()
      const valid = deep && data.routes.some((r) => r.id === deep) ? deep : null
      setSelectedRouteId((cur) => cur || valid || data.routes[0].id)
    })
    fetchPorts().then((data) => {
      if (alive && data) setPortsData({ origins: data.origins || [], destinations: data.destinations || [] })
    })
    fetchRisk().then((data) => {
      if (!alive || !data?.mlRadar) return
      setRadarAlerts(data.mlRadar.alerts || [])
      const ts = data.mlRadar.alerts?.find((a) => a.published)?.published
      if (ts) {
        const mins = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000))
        setRadarAge(mins <= 1 ? 'live' : `${mins}m old`)
      } else {
        setRadarAge('cached')
      }
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!selectedRouteId) return
    let alive = true
    setLoading(true)
    setBookingTarget(null)
    fetchForecast(selectedRouteId).then((data) => {
      if (!alive) return
      if (!data) setFcErr(lastError('forecast') || 'unreachable')
      else setFcErr(null)
      setResult(data)
      setLoading(false)
    })
    return () => { alive = false }
  }, [selectedRouteId, retryTick])

  const selectorRoutes = routesList.length
    ? routesList.map((r) => ({ value: r.id, label: `${r.originName} → ${r.destinationName}`, commodity: r.commodity }))
    : []

  const forecast = result?.forecast || null
  const entry = result?.optimalEntry || null
  const mlEngine = result?.mlEngine || null
  const isLiveML = mlEngine && mlEngine.status !== 'fallback_active' && !mlEngine.status

  const currentSignal = entry?.signal || 'LOCK NOW'
  const signalKey = currentSignal === 'BUY' ? 'BUY NOW' : currentSignal
  const urgency = entry?.urgency || 'HIGH'
  const optimalDay = (() => {
    const traj = mlEngine?.trajectory_30d
    if (traj?.length) {
      const min = traj.reduce((m, t) => (t.expected_rate < m.expected_rate ? t : m), traj[0])
      return `Day ${min.day}`
    }
    if (entry?.projectedTrough) {
      return entry.projectedTrough.inDays <= 30 ? `Day ${entry.projectedTrough.inDays}` : 'Beyond 30d'
    }
    return '—'
  })()
  const troughRate = entry?.projectedTrough?.rate ?? 13.20
  const peakRate = entry?.projectedPeak?.rate ?? 16.40
  const reasoningText = entry?.reasoning ||
    'Market conditions indicate rising freight rates over the next 30 days. Lock rates immediately to avoid projected cost escalation.'

  const tcComparison = useMemo(() => {
    const tc = entry?.spotVsTC
    const spot = tc?.spotRate ?? forecast?.currentRate ?? 14.82
    return [
      { type: 'Spot Rate', rate: spot, delta: 0, duration: 'Single Voyage', flexibility: 'High', risk: 'Market Volatility' },
      { type: '6-Month TC', rate: tc?.tcEquivalent6m ?? spot * 0.92, duration: '6 Months', flexibility: 'Medium', risk: 'Rate Lock-in' },
      { type: '12-Month TC', rate: tc?.tcEquivalent12m ?? spot * 0.85, duration: '12 Months', flexibility: 'Low', risk: 'Long Commitment' },
      { type: 'COA', rate: tc?.coaRate ?? spot * 0.88, duration: 'Multi-Voyage', flexibility: 'Very Low', risk: 'Volume Commitment' },
    ].map((row) => ({ ...row, delta: row.rate - spot, deltaPct: spot > 0 ? ((row.rate - spot) / spot) * 100 : 0 }))
  }, [entry, forecast])

  const exportCsv = () => {
    const traj = mlEngine?.trajectory_30d
    if (!traj?.length) return
    const rows = [['day', 'expected_rate_usd_mt', 'p10_lower', 'p90_upper']]
    traj.forEach((x) => rows.push([x.day, x.expected_rate, x.p10_lower, x.p90_upper]))
    const csv = rows.map((r) => r.join(',')).join('\n')
    const slug = (forecast?.routeName || selectedRouteId || 'route').replace(/[^a-z0-9]+/gi, '_').toLowerCase()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portcast_forecast_${slug}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const mockData = useMemo(() => mockForecastData(), [])
  const baseData = forecast ? buildChartData(forecast, mlEngine) : mockData
  const shockMult = 1 + (whatIf.bunker / 100) + (whatIf.congestion / 100) + (whatIf.demand / 100)
  const forecastData = useMemo(() => {
    if (shockMult === 1) return baseData
    return baseData.map((row) => {
      if (row.type !== 'forecast' && row.p90_upper == null) return row
      return {
        ...row,
        pointForecast: row.pointForecast != null ? Number((row.pointForecast * shockMult).toFixed(2)) : row.pointForecast,
        p10_lower: row.p10_lower != null ? Number((row.p10_lower * shockMult).toFixed(2)) : row.p10_lower,
        p90_upper: row.p90_upper != null ? Number((row.p90_upper * shockMult).toFixed(2)) : row.p90_upper,
        mlPoint: row.mlPoint != null ? Number((row.mlPoint * shockMult).toFixed(2)) : row.mlPoint,
      }
    })
  }, [baseData, shockMult])
  const metrics = forecast?.metrics || {}
  const optimalBooking = mlEngine?.optimal_booking
  const geoRisk = mlEngine?.geopolitical_risk_index

  const perfCards = [
    { label: 'MAPE', value: metrics.mape != null ? `${metrics.mape}%` : `${modelPerformance.mape}%`, desc: 'Mean Absolute % Error' },
    { label: 'RMSE', value: metrics.rmse ?? modelPerformance.rmse, desc: 'Root Mean Square Error' },
    { label: 'R² Score', value: metrics.rSquared ?? modelPerformance.r2, desc: 'Coefficient of Determination' },
    { label: 'Directional Accuracy', value: metrics.directionalAccuracy != null ? `${metrics.directionalAccuracy}%` : `${modelPerformance.directionalAccuracy}%`, desc: 'Trend Prediction' },
    { label: 'Volatility (30D)', value: forecast?.volatility != null ? `${forecast.volatility}%` : '—', desc: 'Recent Rate Volatility' },
  ]

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hero */}
      <ScrollReveal>
        <div className="mb-8">
          <div className="absolute -top-6 -left-6 w-80 h-40 bg-gradient-to-br from-sky-500/[0.06] to-teal-500/[0.03] blur-2xl rounded-full pointer-events-none" />
          <p className="section-label mb-3 text-sky-700">ML Forecasting Engine</p>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Multi-Horizon <span className="text-gradient">Freight Rate Forecaster</span></h1>
          <p className="text-slate-600 max-w-2xl mt-3">LightGBM recursive trajectories with quantile confidence bounds across 7/14/30-day horizons, anchored to live route economics.</p>
        </div>
      </ScrollReveal>

      {/* Route Selector & ML Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <ScrollReveal className="lg:col-span-1">
          <AnimatedCard shimmer>
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-sky-700" />
              Select Route
            </h3>
            {!selectorRoutes.length && (
              <p className="text-xs text-slate-400 font-mono mb-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Loading routes from engine...
              </p>
            )}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {selectorRoutes.map((route) => (
                <motion.button
                  key={route.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRouteId(route.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedRouteId === route.value
                      ? 'bg-sky-50 border-sky-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-sky-200'
                  }`}
                >
                  <p className={`text-sm font-medium ${selectedRouteId === route.value ? 'text-sky-700' : 'text-slate-900'}`}>
                    {route.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{route.commodity}</p>
                </motion.button>
              ))}
            </div>
          </AnimatedCard>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="lg:col-span-2">
          <AnimatedCard beam>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Brain className="w-4 h-4 text-sky-700" />
                Live ML Intelligence
              </h3>
              <div className="flex items-center gap-3">
                {bookingTarget && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-mono">
                    Target Day {bookingTarget.day} · ${Number(bookingTarget.rate).toFixed(2)}
                    <button type="button" aria-label="Clear booking target" onClick={() => setBookingTarget(null)} className="ml-0.5 text-slate-300 hover:text-white">x</button>
                  </span>
                )}
                <div className="flex items-center gap-3">
                  {forecast?.volatility != null && forecast.volatility >= 0.5 && (
                    <span
                      title="30-day realized volatility of route rates"
                      className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                        forecast.volatility > 8 ? 'bg-rose-50 border-rose-200 text-rose-700' :
                        forecast.volatility > 3 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}
                    >
                      Vol {Number(forecast.volatility).toFixed(1)}%
                    </span>
                  )}
                  <span className={`text-xs font-mono flex items-center gap-1 ${loading ? 'text-amber-600' : 'text-emerald-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full status-dot ${loading ? 'amber' : 'green'} ${loading ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    {loading ? 'Computing...' : forecast ? (isLiveML ? 'LightGBM Live' : 'Engine Active') : 'Standby'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-1">Model Type</p>
                <p className="text-sm font-bold text-slate-900">{modelPerformance.modelType}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-1">R² {modelPerformance.r2} · {modelPerformance.confidence}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-1">Current Spot</p>
                <p className="text-sm font-bold text-emerald-600 num">
                  ${forecast?.currentRate ? forecast.currentRate.toFixed(2) : '—'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-1">Momentum</p>
                <p className={`text-sm font-bold ${forecast?.momentumLabel === 'BULLISH' ? 'text-emerald-600' : forecast?.momentumLabel === 'BEARISH' ? 'text-rose-600' : 'text-slate-700'}`}>
                  {forecast?.momentumLabel || '—'} {forecast?.momentum != null ? `${forecast.momentum > 0 ? '+' : ''}${forecast.momentum}%` : ''}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-1">Geo Risk Index</p>
                <p className="text-sm font-bold text-amber-600 num">
                  {geoRisk != null ? `${Number(geoRisk).toFixed(1)}/100` : '—'}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-1">P10 Lower Bound</p>
                <p className="text-xl font-bold text-sky-700 num">
                  ${(troughRate * 0.95).toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-1">Conservative estimate</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-1">Optimal Booking Day</p>
                <p className="text-xl font-bold text-amber-600 num">{optimalDay}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Projected rate: ${(optimalBooking?.target_rate ?? troughRate).toFixed?.(2) ?? troughRate}/MT
                  {optimalBooking?.savings_pct != null && ` (${Number(optimalBooking.savings_pct).toFixed(1)}% saving)`}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-1">P90 Shock Bound</p>
                <p className="text-xl font-bold text-rose-600 num">${(peakRate * 1.08).toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">Stress scenario</p>
              </div>
            </div>
          </AnimatedCard>
        </ScrollReveal>
      </div>

      {fcErr && (
        <FallbackNotice message={fcErr} onRetry={() => { setFcErr(null); invalidate('forecast'); setRetryTick((n) => n + 1) }} />
      )}

      {/* Booking heat strip */}
      <ScrollReveal delay={0.05}>
        <AnimatedCard shimmer>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">30-day model output</p>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!mlEngine?.trajectory_30d?.length}
              title={mlEngine?.trajectory_30d?.length ? 'Download forecast CSV' : 'CSV available once live model responds'}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-sky-700 hover:text-sky-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
          <BookingStrip
            trajectory={mlEngine?.trajectory_30d}
            todayRate={forecast?.currentRate}
            selectedDay={bookingTarget?.day}
            onSelectDay={(day, rate) => setBookingTarget({ day, rate })}
          />
        </AnimatedCard>
      </ScrollReveal>

      {/* Monsoon Surge Overlay — ties to train.py seasonalPremium (Jun-Sep SW / Oct-Dec NE) */}
      {(() => {
        const m = new Date().getMonth() + 1
        const monsoon = (m >= 6 && m <= 9) ? 'Southwest Monsoon (Jun–Sep) — model premium active' : (m >= 10 && m <= 12) ? 'Northeast Monsoon (Oct–Dec) — seasonal headwind' : null
        return monsoon ? (
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> {monsoon}
          </div>
        ) : null
      })()}

      {/* What-If Scenario Scrub — live P10/P90 morph */}
      <ScrollReveal>
        <AnimatedCard className={`border ${
          shockMult === 1
            ? 'bg-gradient-to-r from-sky-50/60 via-white to-violet-50/60 border-sky-200/60'
            : shockMult > 1
              ? 'bg-gradient-to-r from-rose-50/80 via-rose-50/40 to-orange-50/40 border-rose-300'
              : 'bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-sky-50/40 border-emerald-300'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Sliders className={`w-4 h-4 ${shockMult === 1 ? 'text-sky-700' : shockMult > 1 ? 'text-rose-700' : 'text-emerald-700'}`} />
            <h3 className="text-sm font-bold text-slate-900">What-If Scenario</h3>
            <span className={`text-[10px] font-mono uppercase tracking-wider ml-auto px-2 py-0.5 rounded ${
              shockMult === 1
                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                : shockMult > 1
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {shockMult === 1 ? 'Baseline' : `Shock ${shockMult > 1 ? '+' : ''}${((shockMult - 1) * 100).toFixed(1)}%`}
            </span>
            {shockMult !== 1 && (
              <button
                type="button"
                onClick={() => setWhatIf({ bunker: 0, congestion: 0, demand: 0 })}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Reset What-If scenarios to baseline"
              >
                Reset
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { key: 'bunker',     label: 'Bunker shock',     unit: '%', max: 30 },
              { key: 'congestion', label: 'Port congestion',  unit: '%', max: 25 },
              { key: 'demand',     label: 'Demand surge',     unit: '%', max: 20 },
            ].map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-700 font-medium">{s.label}</span>
                  <span className={`num font-bold ${
                    whatIf[s.key] > 0 ? 'text-rose-700' : whatIf[s.key] < 0 ? 'text-emerald-700' : 'text-sky-700'
                  }`}>
                    {whatIf[s.key] > 0 ? `+${whatIf[s.key]}` : whatIf[s.key]}{s.unit}
                  </span>
                </div>
                <input
                  type="range"
                  aria-label={s.label}
                  min={-s.max}
                  max={s.max}
                  step={1}
                  value={whatIf[s.key]}
                  onChange={(e) => setWhatIf((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                  style={{ accentColor: whatIf[s.key] > 0 ? '#dc2626' : whatIf[s.key] < 0 ? '#059669' : '#0284c7' }}
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-mono">
            Multiplicative shock on P10/P90 bands + point forecast. Symmetric ±range; +ve = rate increase.
          </p>
        </AnimatedCard>
      </ScrollReveal>

      {/* Main Chart — premium dense with monsoon reference band */}
      <ScrollReveal>
        <AnimatedCard shimmer beam className="glass-card-dense">
          {shockMult !== 1 && (
            <div className={`mb-4 flex items-center gap-2 p-2.5 rounded-lg border ${
              shockMult > 1
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <Sliders className="w-4 h-4" />
              <p className="text-xs font-semibold">
                Active What-If Shock: {shockMult > 1 ? '+' : ''}{((shockMult - 1) * 100).toFixed(1)}% multiplicative on all P10/P90 bands + point forecast.
              </p>
              <button
                type="button"
                onClick={() => setWhatIf({ bunker: 0, congestion: 0, demand: 0 })}
                className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-current hover:opacity-80"
                aria-label="Reset What-If shocks to baseline"
              >
                Reset
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><span className="w-1 h-6 rounded-full bg-gradient-to-b from-sky-500 to-teal-500" /> Multi-Horizon Rate Trajectory</h2>
              <p className="text-sm text-slate-500 mt-1">
                180-day historical + 30-day forward forecast with P10/P90 confidence bands
                {forecast ? ` — ${forecast.routeName}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500/30 border border-sky-500" />
                <span className="text-slate-600">Historical</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500" />
                <span className="text-slate-600">Forecast</span>
              </span>
              <span
                className="hidden md:inline text-slate-400"
                title="P10/P90 bands widen with horizon: near-term days are tightest, Day 30 the widest — reflecting cumulative forecast uncertainty"
              >
                Bands widen with horizon (near → Day 30)
              </span>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="historicalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.16)" />
                <XAxis
                  dataKey="date"
                  stroke="#475569"
                  fontSize={11}
                  tickFormatter={(val) => String(val).slice(5)}
                  interval={29}
                />
                <YAxis stroke="#475569" fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 4" }}
                  contentStyle={{
                    background: 'rgba(255,255,255,0.97)',
                    border: '1px solid rgba(11,31,58,0.12)',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="p90" stroke="none" fill="url(#confidenceGrad)" fillOpacity={0.18} connectNulls={false} />
                <Area type="monotone" dataKey="p10" stroke="#0284c7" strokeWidth={1} strokeDasharray="4 3" fill="rgba(2,132,199,0.12)" connectNulls={false} />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: "#06b6d4", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#0369a1", stroke: "#fff", strokeWidth: 2 }}
                  fill="url(#historicalGrad)"
                />
                <ReferenceLine x={forecastData.find((d) => d.type === 'forecast')?.date} stroke="#f59e0b" strokeDasharray="3 3" />
                {new Date().getMonth() + 1 >= 6 && new Date().getMonth() + 1 <= 9 && <ReferenceArea x1={forecastData.find((d) => d.type === 'forecast')?.date} x2={forecastData[forecastData.length-1]?.date} fill="#f59e0b" fillOpacity={0.04} strokeOpacity={0} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AnimatedCard>
      </ScrollReveal>

      {/* Recommendation & Comparison */}
      <div className="grid lg:grid-cols-3 gap-6">
        <ScrollReveal>
          <AnimatedCard className={`border-l-4 ${currentSignal === 'LOCK NOW' ? 'border-l-rose-500/50' : currentSignal === 'WAIT' ? 'border-l-amber-500/50' : 'border-l-emerald-500/50'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Optimal Market Entry
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${signalColors[signalKey] || fallbackSignalColors[signalKey]}`}>
                {currentSignal}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/10">
                <p className="text-xs text-slate-500 mb-1">Urgency Level</p>
                <p className={`text-lg font-bold ${urgency === 'HIGH' ? 'text-rose-600' : urgency === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {urgency}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-cyan-500/5 border border-sky-500/20">
                <p className="text-xs text-slate-500 mb-1">Optimal Window</p>
                <p className="text-lg font-bold text-sky-700">{optimalDay}</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-xs text-slate-500 mb-1">Projected Trough</p>
                <p className="text-lg font-bold text-emerald-600">${Number(troughRate).toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-xs text-slate-500 mb-1">Projected Peak</p>
                <p className="text-lg font-bold text-amber-600">${Number(peakRate).toFixed(2)}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="text-sky-700 font-semibold">Recommendation:</span> {reasoningText}
              </p>
            </div>
          </AnimatedCard>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <AnimatedCard>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-700" />
                Spot vs TC & COA Comparison
              </h3>
              <label className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                Parcel size
                <input
                  type="number"
                  min={1000}
                  max={400000}
                  step={1000}
                  value={parcelMT}
                  onChange={(e) => setParcelMT(Math.max(1000, Math.min(400000, Number(e.target.value) || 0)))}
                  aria-label="Parcel size in metric tonnes"
                  className="w-24 px-2 py-1 text-xs font-mono border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <span className="text-slate-400">MT</span>
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {(() => {
                const totals = tcComparison.map((item) => ({ ...item, total: item.rate * parcelMT }))
                const minTotal = Math.min(...totals.map((t) => t.total))
                return totals.map((item) => {
                  const isOpt = item.total === minTotal && tcComparison.length > 1
                  return (
                    <div
                      key={`${item.type}-cum`}
                      className={`relative p-2.5 rounded-md border ${isOpt ? 'border-emerald-300 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-slate-50/50'}`}
                    >
                      {isOpt && (
                        <span className="absolute -top-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-sm">
                          <Award className="w-2.5 h-2.5" /> Best
                        </span>
                      )}
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider truncate">{item.type}</p>
                      <p className={`text-sm font-bold num font-mono mt-0.5 ${isOpt ? 'text-emerald-700' : 'text-slate-900'}`}>${(item.total / 1_000_000).toFixed(2)}M</p>
                      <p className="text-[10px] text-slate-400 num font-mono">{(item.total).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    </div>
                  )
                })
              })()}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider py-3 px-3">Contract Type</th>
                    <th className="text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider py-3 px-3">Rate ($/MT)</th>
                    <th className="text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider py-3 px-3">Δ vs Spot</th>
                    <th className="text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider py-3 px-3">Duration</th>
                    <th className="text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider py-3 px-3">Risk Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {tcComparison.map((item, idx) => (
                    <motion.tr
                      key={item.type}
                      initial={{ y: 6 }}
                      animate={{ y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`border-b border-slate-200 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-sky-50/60`}
                    >
                      <td className="py-3 px-3 text-sm font-semibold text-slate-900">{item.type}</td>
                      <td className="py-3 px-3 text-right text-sm font-bold text-sky-700 num font-mono">${Number(item.rate).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-sm font-mono num font-semibold">
                        {idx === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className={item.delta < 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {item.delta < 0 ? '▼' : '▲'} {item.deltaPct.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-600 font-medium">{item.duration}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          item.risk === 'Market Volatility' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          item.risk === 'Long Commitment' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {item.risk}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cumulative Cost Pareto</h4>
                <span className="text-[10px] font-mono text-slate-400">${parcelMT.toLocaleString()} MT parcel · $/MT rate × MT</span>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tcComparison.map((c) => ({ name: c.type, total: c.rate * parcelMT, isOpt: c.rate * parcelMT === Math.min(...tcComparison.map(x => x.rate * parcelMT)) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,31,58,0.08)" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(11,31,58,0.12)', borderRadius: '8px' }}
                      formatter={(v) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {tcComparison.map((c, i) => {
                        const total = c.rate * parcelMT
                        const isMin = total === Math.min(...tcComparison.map(x => x.rate * parcelMT))
                        return <Cell key={i} fill={isMin ? '#10b981' : '#0284c7'} />
                      })}
                      <LabelList dataKey="total" position="top" style={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#475569' }} formatter={(v) => `$${(v / 1_000_000).toFixed(2)}M`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </AnimatedCard>
        </ScrollReveal>

        <ScrollReveal>
          <AnimatedCard className="h-full">
            <ExplainabilityPanel
              routeId={selectedRouteId}
              baseRate={forecast?.current_rate_pmt}
            />
          </AnimatedCard>
        </ScrollReveal>
      </div>

      {/* Trade lane geography */}
      <ScrollReveal>
        <AnimatedCard>
          <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Target className="w-5 h-5 text-sky-700" />
            Trade Lane Geography
          </h3>
          <RouteMap
            route={routesList.find((r) => r.id === selectedRouteId)}
            origins={portsData.origins}
            destinations={portsData.destinations}
            radarAlerts={radarAlerts}
            radarAge={radarAge}
          />
        </AnimatedCard>
      </ScrollReveal>

      {/* Model Performance */}
      <ScrollReveal>
        <AnimatedCard>
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-700" />
            Model Performance Metrics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {perfCards.map((metric, idx) => (
              <motion.div
                key={metric.label}
                initial={{ scale: 0.97 }}
                animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center"
              >
                <p className="text-xs text-slate-500 mb-2">{metric.label}</p>
                <p className="text-2xl font-mono font-bold text-slate-900">{metric.value}</p>
                <p className="text-[10px] text-slate-400 mt-1">{metric.desc}</p>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      </ScrollReveal>
    </div>
  )
}
