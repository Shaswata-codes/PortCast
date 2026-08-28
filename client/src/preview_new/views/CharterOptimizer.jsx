import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Ship, Clock, AlertTriangle, CheckCircle2, XCircle, Package, Award, TrendingDown, GitCompareArrows } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import AnimatedCard from '../components/AnimatedCard'
import ScrollReveal from '../components/ScrollReveal'
import ImageCard3D from '../components/ImageCard3D'
import { vesselClasses as mockVessels } from '../data/mockData'
import FallbackNotice from '../components/FallbackNotice'
import { fetchRoutes, fetchVessels, fetchOptimize, lastError, invalidate, fetchPortComparison } from '../services/api'
import { takeDeepLinkRouteId } from '../services/routeStore'

const COLORS = ['#0369a1','#d97706','#059669','#7c3aed','#e11d48']

function mapRecommendation(rec, bunkerPrice) {
  const c = rec.costs || {}
  const b = rec.breakdown || {}
  const seaDays = (b.transitDays || 0) + (b.ballastDays || 0)
  const portDays = (b.loadingDays || 0) + (b.dischargeDays || 0) + (b.waitingDays || 0)
  const hasWarnings = (rec.warnings || []).length > 0
  return {
    class: rec.vesselClass,
    vesselId: rec.vesselId,
    color: rec.color,
    isOptimal: !!rec.isOptimal,
    feasible: rec.feasible,
    restricted: rec.feasible && (hasWarnings || (rec.lighterageCost || 0) > 0),
    lighterage: (rec.lighterageCost || 0) > 0,
    constraints: rec.constraints || [],
    warnings: rec.warnings || [],
    utilization: Math.round(rec.utilization ?? 0),
    seaDays,
    portDays,
    freightCost: c.hireCost || 0,
    bunkerCost: c.fuelCost || 0,
    portDues: c.portCharges || 0,
    demurrage: 0,
    lighterageCost: c.lighterageCost || 0,
    totalCost: c.totalVoyageCost || 0,
    costPerMt: rec.totalCostPerMT ?? 0,
    tripsRequired: rec.tripsRequired || 1,
    dailyTCEquivalent: rec.dailyTCEquivalent,
    co2Tonnes: (() => {
      const fuelMt = c.fuelCost && bunkerPrice ? c.fuelCost / bunkerPrice : null
      return fuelMt ? Math.round(fuelMt * 3.114) : null
    })(),
  }
}

export default function CharterOptimizer() {
  const [routesList, setRoutesList] = useState([])
  const [dwtMap, setDwtMap] = useState({})
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [cargoSize, setCargoSize] = useState(75000)
  const [bunkerPrice, setBunkerPrice] = useState(612)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [optErr, setOptErr] = useState(null)
  const [retryTick, setRetryTick] = useState(0)
  const [compareMode, setCompareMode] = useState(false)
  const [portRanking, setPortRanking] = useState(null)

  useEffect(() => {
    let alive = true
    fetchRoutes().then((data) => {
      if (!alive || !data?.routes?.length) return
      setRoutesList(data.routes)
      const deep = takeDeepLinkRouteId()
      const valid = deep && data.routes.some((r) => r.id === deep) ? deep : null
      setSelectedRouteId((cur) => cur || valid || data.routes[0].id)
    })
    fetchVessels().then((data) => {
      if (!alive || !data?.vessels?.length) return
      const map = {}
      data.vessels.forEach((v) => { map[v.id] = v })
      setDwtMap(map)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!compareMode || !selectedRouteId) return
    let alive = true
    const route = routesList.find((r) => r.id === selectedRouteId)
    if (!route) return
    const t2 = setTimeout(() => {
      fetchPortComparison({ origin: route.origin, parcel: cargoSize, bunker: bunkerPrice }).then((data) => {
        if (alive && data?.results) setPortRanking(data)
      })
    }, 300)
    return () => { alive = false; clearTimeout(t2) }
  }, [compareMode, selectedRouteId, cargoSize, bunkerPrice, routesList])

  useEffect(() => {
    if (!selectedRouteId) return
    let alive = true
    setLoading(true)
    const t = setTimeout(() => {
      fetchOptimize({ routeId: selectedRouteId, parcelSizeMT: cargoSize, bunkerPrice }).then((data) => {
        if (!alive) return
        if (!data) setOptErr(lastError('optimize') || 'unreachable')
        else setOptErr(null)
        setResult(data)
        setLoading(false)
      })
    }, 350)
    return () => { alive = false; clearTimeout(t) }
  }, [selectedRouteId, cargoSize, bunkerPrice, retryTick])

  const selectedRoute = routesList.find((r) => r.id === selectedRouteId)

  const vessels = result?.optimization?.recommendations?.length
    ? result.optimization.recommendations.map((rec) => mapRecommendation(rec, bunkerPrice))
    : mockVessels

  const idleRisk = result?.idleRisk || null

  const laycanText = (() => {
    if (!idleRisk?.laycanRecommendation) return '15 - 22 Sep 2026'
    const start = new Date()
    start.setDate(start.getDate() + idleRisk.laycanRecommendation.startDay)
    const end = new Date()
    end.setDate(end.getDate() + idleRisk.laycanRecommendation.endDay)
    const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${fmt(start)} - ${fmt(end)}`
  })()

  const mitigationText = idleRisk?.mitigationStrategies?.length
    ? idleRisk.mitigationStrategies.join(' ')
    : 'Given current port congestion, consider splitting cargo across smaller vessels or negotiate extended laycan with demurrage protection clauses.'

  const optimalEntry = result?.optimalEntry

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      <ScrollReveal>
        <div className="mb-8">
          <p className="section-label mb-3">Voyage Optimization Engine</p>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Intelligent <span className="text-gradient">Chartering Optimizer</span></h1>
          {selectedRoute?.destinationName?.toLowerCase().includes("haldia") && (
            <span className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium"><span className="w-2 h-2 rounded-full bg-amber-500" /> Haldia 8.5m Sandheads — Capesize infeasible · lighterage barge +$5.25/MT</span>
          )}
          <p className="text-slate-600 max-w-2xl mt-3">Evaluate vessel-class feasibility, voyage costs and laycan timing across India's East Coast bulk terminals.</p>
        </div>
      </ScrollReveal>

      {/* Input Panel */}
      <ScrollReveal>
        <AnimatedCard className="border border-slate-200/80 shadow-sm bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Charter Parameters & Voyage Configuration</h3>
                <p className="text-xs text-slate-500">Configure parcel size, bunker price, and destination constraints</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {loading && (
                <span className="text-xs font-mono text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 status-dot amber" /> Evaluating options...
                </span>
              )}
              <button
                type="button"
                onClick={() => setCompareMode((v) => !v)}
                aria-pressed={compareMode}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  compareMode
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <GitCompareArrows className="w-3.5 h-3.5" />
                {compareMode ? 'Hide Port Comparison' : 'Compare Ports'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block uppercase tracking-wider">Shipping Route</label>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-2xs"
              >
                {!routesList.length && <option value="">Loading routes...</option>}
                {routesList.map((r) => (
                  <option key={r.id} value={r.id}>{r.originName} → {r.destinationName}</option>
                ))}
              </select>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2 font-mono px-0.5">
                <span>{selectedRoute ? `${Number(selectedRoute.nauticalMiles).toLocaleString()} NM` : '—'}</span>
                <span>{selectedRoute ? `Base $${selectedRoute.baseFreightRate}/MT` : '—'}</span>
              </div>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block uppercase tracking-wider">Cargo Parcel Size (MT)</label>
              <div className="relative">
                <input
                  type="number"
                  value={cargoSize}
                  onChange={(e) => setCargoSize(Math.max(1000, Number(e.target.value) || 0))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm font-semibold num focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-2xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">MT</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 px-0.5">Recommended: 25,000 – 180,000 MT</p>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block uppercase tracking-wider">Bunker Fuel Price ($/MT)</label>
              <div className="relative">
                <input
                  type="number"
                  value={bunkerPrice}
                  onChange={(e) => setBunkerPrice(Math.max(100, Number(e.target.value) || 0))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm font-semibold num focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-2xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">$/MT</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 px-0.5">Current benchmark VLSFO market rate</p>
            </div>
          </div>

          {result && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div className="flex items-center gap-2 font-mono">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span>{result.optimization?.feasibleOptions}/{result.optimization?.totalOptionsEvaluated} vessel classes feasible</span>
              </div>
              {optimalEntry && (
                <div className="font-mono">
                  Market signal:{' '}
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    optimalEntry.signal === 'LOCK NOW'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : optimalEntry.signal === 'WAIT'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-sky-50 text-sky-700 border border-sky-200'
                  }`}>
                    {optimalEntry.signal}
                  </span>
                </div>
              )}
            </div>
          )}
        </AnimatedCard>
      </ScrollReveal>

      {optErr && (
        <FallbackNotice message={optErr} onRetry={() => { setOptErr(null); invalidate('optimize'); setRetryTick((n) => n + 1) }} />
      )}

      {optimalEntry?.potentialSavingsPerMT > 0 && result?.optimization?.parcelSizeMT && (
        <ScrollReveal>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 shadow-2xs">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <span>Optimization Timing Opportunity</span>
                  <span className="text-xs font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                    ${Math.round(optimalEntry.potentialSavingsPerMT * result.optimization.parcelSizeMT).toLocaleString()} Total Value
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Save ${Number(optimalEntry.potentialSavingsPerMT).toFixed(2)}/MT on this {Number(result.optimization.parcelSizeMT).toLocaleString()} MT parcel by fixing in the recommended optimal booking window.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {compareMode && portRanking && (
        <ScrollReveal>
          <AnimatedCard className="overflow-visible border border-slate-200/80 shadow-sm bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GitCompareArrows className="w-4 h-4 text-sky-700" />
                  Pareto Best Port Finder — {Number(portRanking.parcelSizeMT).toLocaleString()} MT
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked by landed cost/MT across major East Coast terminals (includes ocean freight, fuel & estimated demurrage)
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider py-2.5 px-3">Port</th>
                    <th className="text-left text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider py-2.5 px-3">Best Vessel</th>
                    <th className="text-right text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider py-2.5 px-3">$/MT</th>
                    <th className="text-right text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider py-2.5 px-3">Est. Wait</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {portRanking.results.map((r, i) => (
                    <tr
                      key={r.portId}
                      className={`transition-colors ${
                        i === 0 && r.feasible
                          ? 'bg-emerald-50/80 font-medium'
                          : 'hover:bg-slate-50/80'
                      } ${!r.feasible ? 'opacity-50' : ''}`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {i === 0 && r.feasible && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-bold">BEST</span>
                          )}
                          <span className="text-sm font-semibold text-slate-900">{r.portName}</span>
                          {r.estimated && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200" title="Transit estimated via great-circle distance">~est.</span>
                          )}
                          {r.lighterage && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200" title="Lighterage required">LGR</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-sm font-medium text-slate-700">{r.bestVessel || '—'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`num text-sm font-bold ${i === 0 && r.feasible ? 'text-emerald-700 text-base' : 'text-slate-800'}`}>
                          {r.costPerMT != null ? `$${Number(r.costPerMT).toFixed(2)}` : '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right num text-xs font-semibold text-slate-600">{r.waitDays}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedCard>
        </ScrollReveal>
      )}

      {/* Vessel Cards (4-column responsive grid with aligned heights & metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
        {vessels.map((vessel, idx) => {
          const dwt = dwtMap[vessel.vesselId]?.dwtRangeMax || dwtMap[vessel.vesselId]?.dwtTypical
          const costBreakdown = [
            { name: 'Hire/Freight', value: vessel.freightCost },
            { name: 'Bunker', value: vessel.bunkerCost },
            { name: 'Port Dues', value: vessel.portDues },
            { name: 'Lighterage', value: vessel.lighterageCost },
          ].filter((c) => c.value > 0)

          return (
            <ScrollReveal key={`${vessel.class}-${idx}`} delay={idx * 0.08} className="flex">
              <motion.div
                whileHover={{ y: -4 }}
                className={`w-full flex flex-col justify-between rounded-xl p-5 border bg-white shadow-sm transition-all relative ${
                  !vessel.feasible
                    ? 'border-rose-200 bg-rose-50/20'
                    : vessel.restricted
                    ? 'border-amber-200'
                    : vessel.isOptimal
                    ? 'border-emerald-300 ring-2 ring-emerald-500/20 shadow-md'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Row */}
                <div>
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${
                        !vessel.feasible ? 'bg-rose-100 text-rose-700' :
                        vessel.restricted ? 'bg-amber-100 text-amber-700' :
                        'bg-sky-100 text-sky-700'
                      }`}>
                        <Ship className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">{vessel.class}</h3>
                        <p className="text-[11px] font-mono text-slate-500">
                          {vessel.tripsRequired > 1 ? `${vessel.tripsRequired} voyages` : dwt ? `${Number(dwt).toLocaleString()} DWT` : 'Standard'}
                        </p>
                      </div>
                    </div>
                    {vessel.isOptimal && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-[10px] font-bold text-white shadow-xs">
                        <Award className="w-3 h-3" /> OPTIMAL
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      vessel.lighterage ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      !vessel.feasible ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      vessel.restricted ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {vessel.lighterage ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> :
                       vessel.feasible ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                      {vessel.lighterage ? 'Lighterage Required' : vessel.feasible ? (vessel.restricted ? 'Restricted Feasibility' : 'Fully Feasible') : 'Draft Infeasible'}
                    </span>
                  </div>

                  {/* Warnings or Constraints Alert box */}
                  <div className="min-h-[44px] mb-3">
                    {!vessel.feasible && (vessel.constraints || []).length > 0 && (
                      <p className="text-xs text-rose-700 bg-rose-50/80 border border-rose-100 p-2 rounded-lg leading-snug">
                        {vessel.constraints[0]}
                      </p>
                    )}
                    {vessel.feasible && (vessel.warnings || []).length > 0 && (
                      <p className="text-xs text-amber-800 bg-amber-50/80 border border-amber-100 p-2 rounded-lg leading-snug">
                        {vessel.warnings[0]}
                      </p>
                    )}
                    {vessel.feasible && (!vessel.warnings || vessel.warnings.length === 0) && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg leading-snug">
                        No draft or beam restrictions at berth.
                      </p>
                    )}
                  </div>

                  {!vessel.feasible && (
                    <div className="py-12 text-center rounded-lg border border-dashed border-rose-200 bg-rose-50/30 my-4">
                      <XCircle className="w-7 h-7 text-rose-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-rose-800">Terminal Incompatible</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">Exceeds port draft limits</p>
                    </div>
                  )}

                  {vessel.feasible && (
                    <>
                      {/* Utilization & Timeline */}
                      <div className="space-y-2.5 mb-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-medium">Capacity Utilization</span>
                          <span className="font-mono font-bold text-slate-900">{vessel.utilization}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              vessel.utilization > 90 ? 'bg-emerald-500' :
                              vessel.utilization > 70 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, vessel.utilization)}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="text-xs">
                            <span className="text-slate-500 block text-[10px] uppercase font-mono">Sea Days</span>
                            <span className="font-mono font-semibold text-slate-800">{vessel.seaDays}d</span>
                          </div>
                          <div className="text-xs text-right">
                            <span className="text-slate-500 block text-[10px] uppercase font-mono">Port Days</span>
                            <span className="font-mono font-semibold text-slate-800">{vessel.portDays}d</span>
                          </div>
                        </div>
                      </div>

                      {/* Mini Donut Breakdown */}
                      <div className="h-28 mb-3 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={costBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={32}
                              outerRadius={50}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {costBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: 'rgba(255,255,255,0.98)',
                                border: '1px solid rgba(11,31,58,0.12)',
                                borderRadius: '6px',
                                fontSize: '11px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                              }}
                              formatter={(value) => `$${value.toLocaleString()}`}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Cost Line Items */}
                      <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3 mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Hire Cost</span>
                          <span className="font-mono font-medium text-slate-700">${vessel.freightCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Bunker Cost</span>
                          <span className="font-mono font-medium text-slate-700">${vessel.bunkerCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Port Dues</span>
                          <span className="font-mono font-medium text-slate-700">${vessel.portDues.toLocaleString()}</span>
                        </div>
                        {vessel.lighterageCost > 0 && (
                          <div className="flex justify-between">
                            <span className="text-amber-700 font-medium">Lighterage</span>
                            <span className="font-mono font-medium text-amber-700">${vessel.lighterageCost.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom Total Footer */}
                {vessel.feasible && (
                  <div className="pt-3 border-t border-slate-200 bg-slate-50/50 -mx-5 -mb-5 p-4 rounded-b-xl mt-auto">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Voyage</span>
                      <span className="text-base font-mono font-bold text-slate-900">${vessel.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xs font-medium text-slate-500">Effective $/MT</span>
                      <span className={`text-sm font-mono font-bold ${
                        vessel.costPerMt < 10 ? 'text-emerald-700' : 'text-slate-900'
                      }`}>${Number(vessel.costPerMt).toFixed(2)}</span>
                    </div>
                    {vessel.dailyTCEquivalent != null && (
                      <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-mono">
                        <span>Daily TCE:</span>
                        <span>${Number(vessel.dailyTCEquivalent).toLocaleString()}/d</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </ScrollReveal>
          )
        })}
      </div>

      {/* Laycan Advisory */}
      <ScrollReveal>
        <AnimatedCard className="border border-slate-200/80 shadow-sm bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Laycan Timing & Idle Risk Advisory</h3>
                <p className="text-xs text-slate-500">Port congestion forecast and demurrage liability mitigation</p>
              </div>
            </div>
            {idleRisk && (
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                idleRisk.riskLevel === 'HIGH' ? 'border-rose-300 text-rose-800 bg-rose-50' :
                idleRisk.riskLevel === 'MEDIUM' ? 'border-amber-300 text-amber-800 bg-amber-50' :
                'border-emerald-300 text-emerald-800 bg-emerald-50'
              }`}>
                Risk Score: {idleRisk.riskScore}/100 ({idleRisk.riskLevel})
              </span>
            )}
          </div>

          {result?.bookingAlignment && (
            <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border ${
              result.bookingAlignment.within
                ? 'bg-emerald-50/80 border-emerald-200'
                : 'bg-amber-50/80 border-amber-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {result.bookingAlignment.within ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className={`text-xs font-semibold ${result.bookingAlignment.within ? 'text-emerald-900' : 'text-amber-900'}`}>
                  {result.bookingAlignment.within
                    ? `Forecast trough (Day ${result.bookingAlignment.troughDay}) aligns with laycan window — fix in this window for optimal freight.`
                    : `Forecast trough (Day ${result.bookingAlignment.troughDay}) falls outside laycan window ${result.bookingAlignment.laycanStart}–${result.bookingAlignment.laycanEnd}d — evaluate charter timing.`}
                </span>
              </div>
              {result.bookingAlignment.mlTargetDay != null && (
                <span className="text-[11px] font-mono text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200/60">
                  ML trough: Day {result.bookingAlignment.mlTargetDay} {result.bookingAlignment.mlSource ? '(LightGBM)' : '(fallback)'}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70">
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1">Recommended Laycan Window</p>
              <p className="text-xl font-bold font-mono text-amber-800">{laycanText}</p>
              <p className="text-xs text-slate-600 mt-1.5">{idleRisk?.laycanRecommendation?.note || 'Based on forecast trough & port availability'}</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/70">
              <p className="text-xs font-semibold text-rose-900 uppercase tracking-wider mb-1">Demurrage Risk Level</p>
              <p className="text-xl font-bold font-mono text-rose-700">{(idleRisk?.riskLevel || 'ELEVATED').toUpperCase()}</p>
              <p className="text-xs text-slate-600 mt-1.5">
                {idleRisk
                  ? `${idleRisk.portName}: ${idleRisk.estimatedWaitingDays}d est. wait · Liability ~$${Number(idleRisk.demurrage?.estimatedLiability || 0).toLocaleString()}`
                  : 'Awaiting engine evaluation...'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
              <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wider mb-1">Despatch Earnings Potential</p>
              <p className="text-xl font-bold font-mono text-emerald-700">
                ${Number(idleRisk?.despatch?.potentialEarnings || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 mt-1.5">
                Laytime {idleRisk?.demurrage?.allowedLaytime ?? '—'}d allowed vs {idleRisk?.demurrage?.dischargeDays ?? '—'}d discharge
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <p className="text-xs text-slate-700 leading-relaxed">
              <span className="font-bold text-sky-800 uppercase tracking-wider mr-1">Mitigation Strategy:</span> {mitigationText}
            </p>
          </div>
        </AnimatedCard>
      </ScrollReveal>
    </div>
  )
}
