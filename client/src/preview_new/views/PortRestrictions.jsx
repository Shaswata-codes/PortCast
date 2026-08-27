import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Anchor, Ruler, Waves, Moon, AlertTriangle, CheckCircle2, XCircle, Ship, Search, X } from 'lucide-react'
import AnimatedCard from '../components/AnimatedCard'
import ScrollReveal from '../components/ScrollReveal'
import ImageCard3D from '../components/ImageCard3D'
import { portComplianceMatrix as mockMatrix } from '../data/mockData'
import { fetchPorts } from '../services/api'

function mapPort(p) {
  const vf = p.vesselFeasibility || {}
  return {
    id: p.id,
    port: p.name,
    state: p.state,
    maxDraft: p.maxDraft,
    maxLOA: p.maxLOA,
    maxBeam: p.maxBeam,
    berths: p.dryBulkBerths,
    dischargeRate: p.avgDischargeRate || 0,
    waitingDays: p.avgWaitingDays ?? 0,
    handysize: !!vf.handysize,
    supramax: !!vf.supramax,
    panamax: !!vf.panamax,
    capesize: !!vf.capesize,
    nightNav: !!p.nightNavigation,
    tidalRange: p.tidalRange ?? 0,
    lighterage: !!p.lighterageRequired,
    lighterageCost: p.lighterageCostPerMT,
    lighterageNote: p.lighterageNote,
    commodities: p.commodities || [],
    capacityMTPA: p.annualCapacityMTPA,
  }
}

export default function PortRestrictions() {
  const [matrix, setMatrix] = useState(mockMatrix)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    fetchPorts().then((data) => {
      if (!alive || !data?.destinations?.length) return
      setMatrix(data.destinations.map(mapPort))
    })
    return () => { alive = false }
  }, [])

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      <ScrollReveal>
        <div className="mb-8">
          <p className="section-label mb-3">Infrastructure Compliance</p>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">Port Infrastructure & Fleet Compatibility</h1>
          <p className="text-slate-600 max-w-2xl mt-3">Live compliance matrix for India's East Coast bulk terminals — verify vessel specs against port constraints before fixture.</p>
        </div>
      </ScrollReveal>

      {/* Compliance Matrix dense */}
      <ScrollReveal>
        <AnimatedCard className="overflow-hidden glass-card-dense">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-sky-700" />
              Master Compliance Matrix
              <span className="hidden sm:inline text-[10px] font-mono text-slate-400 font-normal">HS Handysize · SM Supramax · PM Panamax · CS Capesize</span>
            </h2>
            <div className="ml-auto relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter ports or commodities..."
                aria-label="Filter ports"
                className="pl-8 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-64"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear filter"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th className="text-left text-xs font-mono text-slate-500 uppercase tracking-wider py-3 px-3">Port</th>
                  <th className="text-right text-xs font-mono text-slate-500 uppercase tracking-wider py-3 px-3">Max Draft (m)</th>
                  <th className="text-right text-xs font-mono text-slate-500 uppercase tracking-wider py-3 px-3">Max LOA (m)</th>
                  <th className="text-right text-xs font-mono text-slate-500 uppercase tracking-wider py-3 px-3">Beam (m)</th>
                  <th className="text-right text-xs font-mono text-slate-500 uppercase tracking-wider py-3 px-3">Berths</th>
                  <th className="text-right text-xs font-mono text-slate-500 uppercase tracking-wider py-3 px-3">Discharge (MT/d)</th>
                  <th className="text-right text-xs font-mono text-slate-500 uppercase tracking-wider py-3 px-3">Wait (d)</th>
                  <th title="Handysize" className="text-center text-xs font-mono text-slate-500 uppercase tracking-wider py-3 px-2 cursor-help">HS</th>
                  <th title="Supramax" className="text-center text-xs font-mono text-slate-500 uppercase tracking-wider py-3 px-2 cursor-help">SM</th>
                  <th title="Panamax" className="text-center text-xs font-mono text-slate-500 uppercase tracking-wider py-3 px-2 cursor-help">PM</th>
                  <th title="Capesize" className="text-center text-xs font-mono text-slate-500 uppercase tracking-wider py-3 px-2 cursor-help">CS</th>
                </tr>
              </thead>
              <tbody>
                {matrix.filter((p) => !query || p.port.toLowerCase().includes(query.toLowerCase()) || (p.commodities || []).some((c) => String(c).toLowerCase().includes(query.toLowerCase()))).map((port, idx) => (
                  <motion.tr
                    key={port.port}
                    initial={{ y: 6 }}
                    animate={{ y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                    className="border-b border-slate-200 even:bg-slate-50/70 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Anchor className="w-4 h-4 text-sky-700" />
                        <span className="text-sm font-medium text-slate-900">{port.port}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-slate-900">{port.maxDraft}</td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-slate-900">{port.maxLOA}</td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-slate-900">{port.maxBeam}</td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-slate-900">{port.berths}</td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-sky-700">{Number(port.dischargeRate).toLocaleString()}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-mono text-sm ${port.waitingDays > 4 ? 'text-rose-600' : port.waitingDays > 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {port.waitingDays}
                      </span>
                    </td>
                    {['handysize', 'supramax', 'panamax', 'capesize'].map((cls) => (
                      <td key={cls} className="py-3 px-2 text-center">
                        {port[cls] ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600/50 mx-auto" />
                        )}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedCard>
      </ScrollReveal>

      {/* Terminal Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {matrix.filter((p) => !query || p.port.toLowerCase().includes(query.toLowerCase()) || (p.commodities || []).some((c) => String(c).toLowerCase().includes(query.toLowerCase()))).map((port, idx) => (
          <ScrollReveal key={port.port} delay={idx * 0.08}>
            <motion.div
              whileHover={{ y: -6 }}
              className="glass-card rounded-xl p-5 glass-card-hover"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{port.port}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {port.state}{port.capacityMTPA ? ` | ${port.capacityMTPA} MTPA` : ''}
                  </p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end max-w-[55%]">
                  {(port.commodities || []).slice(0, 3).map((c, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 font-mono">
                      {String(c).split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Ruler className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500">Draft</span>
                  </div>
                  <p className="text-sm font-mono text-slate-900">{port.maxDraft}m</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Ship className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500">LOA</span>
                  </div>
                  <p className="text-sm font-mono text-slate-900">{port.maxLOA}m</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Waves className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500">Tidal Range</span>
                  </div>
                  <p className="text-sm font-mono text-slate-900">{port.tidalRange}m</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Moon className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500">Night Nav</span>
                  </div>
                  <p className="text-sm font-mono text-slate-900">{port.nightNav ? 'Permitted' : 'Restricted'}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <p className="text-[10px] text-slate-500 mb-2">VESSEL COMPATIBILITY</p>
                <div className="flex gap-2">
                  {['Handysize', 'Supramax', 'Panamax', 'Capesize'].map((cls) => {
                    const compatible = port[cls.toLowerCase()]
                    return (
                      <span
                        key={cls}
                        title={compatible ? `${cls} compatible` : `${cls} not permitted`}
                        className={`text-[10px] px-2 py-1 rounded-full border font-medium ${
                          compatible
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600/50 border-rose-500/10'
                        }`}
                      >
                        {cls.slice(0, 2).toUpperCase()}
                      </span>
                    )
                  })}
                </div>
              </div>

              {port.lighterage && (
                <div className="mt-3 p-2 rounded bg-amber-500/5 border border-amber-500/10 flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-[10px] text-amber-600 leading-relaxed">
                    Lighterage required{port.lighterageCost ? ` (+$${port.lighterageCost}/MT)` : ''} — {port.lighterageNote || 'barge transfer at anchorage'}
                  </span>
                </div>
              )}
            </motion.div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  )
}
