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
        <AnimatedCard>
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-700" />
            Charter Parameters
            {loading && (
              <span className="text-xs font-mono text-amber-600 flex items-center gap-1.5 ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 status-dot amber" /> Evaluating...
              </span>
            )}
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm text-slate-600 mb-2 block">Shipping Route</label>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                {!routesList.length && <option value="">Loading routes...</option>}
                {routesList.map((r) => (
                  <option key={r.id} value={r.id}>{r.originName} → {r.destinationName}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-2 font-mono">
                {selectedRoute ? `${Number(selectedRoute.nauticalMiles).toLocaleString()} NM | Base $${selectedRoute.baseFreightRate}/MT` : '—'}
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-2 block font-medium">Cargo Parcel Size (MT)</label>
              <input
                type="number"
                value={cargoSize}
                onChange={(e) => setCargoSize(Math.max(1000, Number(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm font-semibold num focus:outline-none focus:border-sky-500 transition-colors"
              />
              <p className="text-xs text-slate-500 mt-2">Recommended: 25,000 - 180,000 MT</p>
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-2 block font-medium">Bunker Fuel Price ($/MT)</label>
              <input
                type="number"
                value={bunkerPrice}
                onChange={(e) => setBunkerPrice(Math.max(100, Number(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm font-semibold num focus:outline-none focus:border-sky-500 transition-colors"
              />
              <p className="text-xs text-slate-500 mt-2">Current VLSFO market rate</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCompareMode((v) => !v)}
            aria-pressed={compareMode}
            className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              compareMode
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
            {compareMode ? 'Hide port comparison' : 'Compare all East Coast ports'}
          </button>

          {result && (
            <p className="text-xs font-mono mt-4 text-slate-500">
              {result.optimization?.feasibleOptions}/{result.optimization?.totalOptionsEvaluated} vessel classes feasible
              {optimalEntry && (
                <> | Market signal: <span className={optimalEntry.signal === 'LOCK NOW' ? 'text-rose-600' : optimalEntry.signal === 'WAIT' ? 'text-emerald-600' : 'text-sky-700'}>{optimalEntry.signal}</span></>
              )}
            </p>
          )}
        </AnimatedCard>
      </ScrollReveal>

      {optErr && (
        <FallbackNotice message={optErr} onRetry={() => { setOptErr(null); invalidate('optimize'); setRetryTick((n) => n + 1) }} />
      )}

      {optimalEntry?.potentialSavingsPerMT > 0 && result?.optimization?.parcelSizeMT && (
        <ScrollReveal>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-700" />
              <span className="text-sm font-semibold text-emerald-900">
                Timing value: ${Math.round(optimalEntry.potentialSavingsPerMT * result.optimization.parcelSizeMT).toLocaleString()}
              </span>
            </div>
            <span className="text-xs text-emerald-700">
              potential saving on this {Number(result.optimization.parcelSizeMT).toLocaleString()} MT parcel
              (${Number(optimalEntry.potentialSavingsPerMT).toFixed(2)}/MT between best and worst projected window)
            </span>
          </div>
        </ScrollReveal>
      )}

      {compareMode && portRanking && (
        <ScrollReveal>
          <AnimatedCard className="overflow-visible">
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-sky-700" />
              Best Port Finder — {Number(portRanking.parcelSizeMT).toLocaleString()} MT
            </h3>
            <p
              className="text-xs text-slate-400 mb-4"
              title="Wait days from historical congestion. Costs include hire, fuel and dues. Rows tagged ~est. use great-circle distance estimates at 14 kn where no direct route exists."
            >
              Ranked by best feasible cost/MT · wait days from historical congestion · costs include fuel + demurrage
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-xs font-mono text-slate-500 uppercase py-2.5 px-3">Port</th>
                    <th className="text-left text-xs font-mono text-slate-500 uppercase py-2.5 px-3">Best Vessel</th>
                    <th className="text-right text-xs font-mono text-slate-500 uppercase py-2.5 px-3">$/MT</th>
                    <th className="text-right text-xs font-mono text-slate-500 uppercase py-2.5 px-3">Wait</th>
                  </tr>
                </thead>
                <tbody>
                  {portRanking.results.map((r, i) => (
                    <tr
                      key={r.portId}
                      className={`border-b border-slate-100 ${i === 0 && r.feasible ? 'bg-emerald-100 border-l-4 border-l-emerald-500' : ''} ${!r.feasible ? 'opacity-45' : ''}`}
                    >
                      <td className="py-2.5 px-3">
                        <span className="text-sm font-medium text-slate-900">{r.portName}</span>
                        {r.estimated && (
                          <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500" title="Transit estimated via great-circle distance">~est.</span>
                        )}
                        {r.lighterage && (
                          <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700" title="Lighterage required">LGR</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-sm font-medium text-slate-700">{r.bestVessel || '—'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`num text-sm font-bold ${i === 0 && r.feasible ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {r.costPerMT != null ? `$${Number(r.costPerMT).toFixed(2)}` : '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right num text-xs text-slate-600">{r.waitDays}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedCard>
        </ScrollReveal>
      )}

      {/* Vessel Cards */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {vessels.map((vessel, idx) => {
          const dwt = dwtMap[vessel.vesselId]?.dwtRangeMax || dwtMap[vessel.vesselId]?.dwtTypical
          const costBreakdown = [
            { name: 'Hire/Freight', value: vessel.freightCost },
            { name: 'Bunker', value: vessel.bunkerCost },
            { name: 'Port Dues', value: vessel.portDues },
            { name: 'Lighterage', value: vessel.lighterageCost },
          ].filter((c) => c.value > 0)

          return (
            <ScrollReveal key={`${vessel.class}-${idx}`} delay={idx * 0.08}>
              <motion.div
                whileHover={{ y: -8 }}
                className={`glass-card rounded-xl p-5 border-l-4 relative ${
                  !vessel.feasible ? 'border-l-rose-500' :
                  vessel.restricted ? 'border-l-amber-500' : 'border-l-emerald-500'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{vessel.class}</h3>
                  {vessel.isOptimal && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                      <Award className="w-3 h-3" /> OPTIMAL
                    </span>
                  )}
                  <span className="text-xs font-mono text-slate-500">
                    {vessel.tripsRequired > 1 ? `${vessel.tripsRequired} voyages` : dwt ? `${Number(dwt).toLocaleString()} DWT` : ''}
                  </span>
                </div>

                <div className="mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    vessel.lighterage ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                    !vessel.feasible ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                    vessel.restricted ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  }`}>
                    {vessel.lighterage ? <AlertTriangle className="w-3 h-3" /> :
                     vessel.feasible ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {vessel.lighterage ? 'Lighterage Required' : vessel.feasible ? (vessel.restricted ? 'Restricted' : 'Feasible') : 'Infeasible'}
                  </span>
                </div>

                {!vessel.feasible && (vessel.constraints || []).length > 0 && (
                  <p className="text-xs text-rose-600 mb-4 leading-relaxed">{vessel.constraints[0]}</p>
                )}
                {vessel.feasible && (vessel.warnings || []).length > 0 && (
                  <p className="text-xs text-amber-700 mb-4 leading-relaxed">{vessel.warnings[0]}</p>
                )}

                {!vessel.feasible && (
                  <div className="py-6 mb-2 text-center">
                    <XCircle className="w-5 h-5 text-rose-400 mx-auto mb-1.5" />
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Not evaluated · constraints exceeded</p>
                  </div>
                )}

                {vessel.feasible && (
                  <>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Capacity Utilization</span>
                        <span className="font-mono text-slate-900">{vessel.utilization}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            vessel.utilization > 90 ? 'bg-emerald-500' :
                            vessel.utilization > 70 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, vessel.utilization)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Sea Days</span>
                        <span className="font-mono text-slate-900">{vessel.seaDays}d</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Port Days</span>
                        <span className="font-mono text-slate-900">{vessel.portDays}d</span>
                      </div>
                    </div>

                    <div className="mb-3 flex gap-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
                      {costBreakdown.map((seg, si) => {
                        const total = costBreakdown.reduce((s, x) => s + x.value, 0) || 1
                        const pct = (seg.value / total) * 100
                        return <span key={si} style={{ width: `${pct}%`, background: COLORS[si % COLORS.length] }} title={`${seg.name}: $${Math.round(seg.value).toLocaleString()} (${pct.toFixed(0)}%)`} />
                      })}
                    </div>
                    <div className="h-32 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={costBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={62}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {costBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: 'rgba(255,255,255,0.97)',
                              border: '1px solid rgba(11,31,58,0.12)',
                              borderRadius: '6px',
                              fontSize: '11px',
                            }}
                            formatter={(value) => `$${value.toLocaleString()}`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 text-xs border-t border-slate-200 pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Hire Cost</span>
                        <span className="font-mono text-slate-700">${vessel.freightCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bunker Cost</span>
                        <span className="font-mono text-slate-700">${vessel.bunkerCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Port Dues</span>
                        <span className="font-mono text-slate-700">${vessel.portDues.toLocaleString()}</span>
                      </div>
                      {vessel.demurrage > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Demurrage</span>
                          <span className="font-mono text-rose-600">${vessel.demurrage.toLocaleString()}</span>
                        </div>
                      )}
                      {vessel.lighterageCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Lighterage</span>
                          <span className="font-mono text-amber-600">${vessel.lighterageCost.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Total Voyage Cost</span>
                        <span className="text-lg font-mono font-bold text-slate-900">${vessel.totalCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-slate-500">Effective Cost/MT</span>
                        <span className={`text-sm font-mono font-bold ${
                          vessel.costPerMt < 10 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>${Number(vessel.costPerMt).toFixed(2)}</span>
                      </div>
                      {vessel.dailyTCEquivalent != null && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-slate-500">Daily TC Equivalent</span>
                          <span className="text-xs font-mono text-slate-600">${Number(vessel.dailyTCEquivalent).toLocaleString()}/day</span>
                        </div>
                      )}
                      {vessel.co2Tonnes != null && (
                        <div className="flex justify-between items-center mt-1" title="Estimated laden voyage CO2e — IMO factor 3.114 t CO2 per tonne of VLSFO, sea days only (port/idle excluded)">
                          <span className="text-xs text-slate-400">Voyage CO2e (est.)</span>
                          <span className="text-xs font-mono text-slate-500">{vessel.co2Tonnes.toLocaleString()} t</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </ScrollReveal>
          )
        })}
      </div>

      {/* Laycan Advisory */}
      <ScrollReveal>
        <AnimatedCard className="border-l-4 border-l-amber-500/50">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Laycan Timing & Idle Risk Advisory
            {idleRisk && (
              <span className={`ml-2 text-xs font-mono px-2 py-0.5 rounded-full border ${
                idleRisk.riskLevel === 'HIGH' ? 'border-rose-500/30 text-rose-600 bg-rose-500/10' :
                idleRisk.riskLevel === 'MEDIUM' ? 'border-amber-500/30 text-amber-600 bg-amber-500/10' :
                'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
              }`}>
                Risk Score: {idleRisk.riskScore}/100 ({idleRisk.riskLevel})
              </span>
            )}
          </h3>
          {result?.bookingAlignment && (
            <div className={`mb-4 flex flex-wrap items-center gap-2 px-4 py-3 rounded-lg border ${
              result.bookingAlignment.within
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              {result.bookingAlignment.within ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              <span className={`text-sm font-medium ${result.bookingAlignment.within ? 'text-emerald-800' : 'text-amber-800'}`}>
                {result.bookingAlignment.within
                  ? `Forecast trough (Day ${result.bookingAlignment.troughDay}) falls inside the laycan window — fix in this window`
                  : `Forecast trough (Day ${result.bookingAlignment.troughDay}) falls outside laycan ${result.bookingAlignment.laycanStart}–${result.bookingAlignment.laycanEnd}d — timing trade-off`}
              </span>
              {result.bookingAlignment.mlTargetDay != null && (
                <span
                  className="ml-auto text-[11px] font-mono text-slate-500"
                  title={result.bookingAlignment.mlSource ? 'Per the LightGBM trajectory' : 'Per the fallback engine'}
                >
                  ML model trough: Day {result.bookingAlignment.mlTargetDay}
                  {result.bookingAlignment.mlSource ? ' (LightGBM)' : ' (fallback)'}
                </span>
              )}
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <p className="text-xs text-slate-500 mb-2">Recommended Laycan Window</p>
              <p className="text-lg font-bold text-amber-600">{laycanText}</p>
              <p className="text-xs text-slate-400 mt-1">{idleRisk?.laycanRecommendation?.note || 'Based on forecast trough & port availability'}</p>
            </div>
            <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/10">
              <p className="text-xs text-slate-500 mb-2">Demurrage Risk Level</p>
              <p className="text-lg font-bold text-rose-600">{(idleRisk?.riskLevel || 'ELEVATED').toUpperCase()}</p>
              <p className="text-xs text-slate-400 mt-1">
                {idleRisk
                  ? `${idleRisk.portName}: ${idleRisk.estimatedWaitingDays}d est. wait | Liability ~$${Number(idleRisk.demurrage?.estimatedLiability || 0).toLocaleString()}`
                  : 'Waiting for engine...'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-xs text-slate-500 mb-2">Despatch Earnings Potential</p>
              <p className="text-lg font-bold text-emerald-600">
                ${Number(idleRisk?.despatch?.potentialEarnings || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Laytime {idleRisk?.demurrage?.allowedLaytime ?? '—'}d allowed vs {idleRisk?.demurrage?.dischargeDays ?? '—'}d discharge
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="text-sky-700 font-semibold">Mitigation Strategy:</span> {mitigationText}
            </p>
          </div>
        </AnimatedCard>
      </ScrollReveal>
    </div>
  )
}
