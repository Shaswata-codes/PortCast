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
        <AnimatedCard className="overflow-hidden border border-slate-200/80 shadow-sm bg-white p-0">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
                <Ruler className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Master Compliance Matrix
                </h2>
                <p className="text-xs text-slate-500">Draft, LOA, beam constraints, discharge rates and class permissions across terminals</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter ports or cargo types..."
                  aria-label="Filter ports"
                  className="pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full sm:w-64 transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear filter"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="hidden lg:inline text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                HS: Handysize · SM: Supramax · PM: Panamax · CS: Capesize
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="py-3 px-4 text-xs font-mono font-bold text-slate-700 uppercase tracking-wider min-w-[150px]">Port Terminal</th>
                  <th className="py-3 px-3 text-right text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Max Draft</th>
                  <th className="py-3 px-3 text-right text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Max LOA</th>
                  <th className="py-3 px-3 text-right text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Max Beam</th>
                  <th className="py-3 px-3 text-right text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Berths</th>
                  <th className="py-3 px-3 text-right text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Discharge</th>
                  <th className="py-3 px-3 text-right text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Est. Wait</th>
                  <th title="Handysize Feasibility" className="py-3 px-2 text-center text-xs font-mono font-bold text-slate-700 uppercase tracking-wider w-12 cursor-help">HS</th>
                  <th title="Supramax Feasibility" className="py-3 px-2 text-center text-xs font-mono font-bold text-slate-700 uppercase tracking-wider w-12 cursor-help">SM</th>
                  <th title="Panamax Feasibility" className="py-3 px-2 text-center text-xs font-mono font-bold text-slate-700 uppercase tracking-wider w-12 cursor-help">PM</th>
                  <th title="Capesize Feasibility" className="py-3 px-2 text-center text-xs font-mono font-bold text-slate-700 uppercase tracking-wider w-12 cursor-help">CS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {matrix.filter((p) => !query || p.port.toLowerCase().includes(query.toLowerCase()) || (p.commodities || []).some((c) => String(c).toLowerCase().includes(query.toLowerCase()))).map((port, idx) => (
                  <motion.tr
                    key={port.port}
                    initial={{ y: 6 }}
                    animate={{ y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-slate-100 text-sky-700">
                          <Anchor className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900 block leading-tight">{port.port}</span>
                          <span className="text-[10px] font-mono text-slate-400">{port.state}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-sm font-semibold text-slate-800">{port.maxDraft}m</td>
                    <td className="py-3.5 px-3 text-right font-mono text-sm text-slate-700">{port.maxLOA}m</td>
                    <td className="py-3.5 px-3 text-right font-mono text-sm text-slate-700">{port.maxBeam}m</td>
                    <td className="py-3.5 px-3 text-right font-mono text-sm text-slate-700">{port.berths}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-sm font-semibold text-sky-700">{Number(port.dischargeRate).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">t/d</span></td>
                    <td className="py-3.5 px-3 text-right">
                      <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        port.waitingDays > 4 ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        port.waitingDays > 2 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {port.waitingDays}d
                      </span>
                    </td>
                    {['handysize', 'supramax', 'panamax', 'capesize'].map((cls) => (
                      <td key={cls} className="py-3.5 px-2 text-center">
                        {port[cls] ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {matrix.filter((p) => !query || p.port.toLowerCase().includes(query.toLowerCase()) || (p.commodities || []).some((c) => String(c).toLowerCase().includes(query.toLowerCase()))).map((port, idx) => (
          <ScrollReveal key={port.port} delay={idx * 0.06} className="flex">
            <motion.div
              whileHover={{ y: -4 }}
              className="w-full flex flex-col justify-between rounded-xl p-5 border border-slate-200/80 bg-white shadow-sm hover:border-sky-500/30 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">{port.port}</h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {port.state}{port.capacityMTPA ? ` · ${port.capacityMTPA} MTPA` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end max-w-[50%]">
                    {(port.commodities || []).slice(0, 3).map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 font-mono">
                        {String(c).split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Ruler className="w-3.5 h-3.5 text-sky-700" />
                      <span className="text-[10px] uppercase font-mono font-semibold text-slate-500">Max Draft</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-slate-900">{port.maxDraft}m</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Ship className="w-3.5 h-3.5 text-sky-700" />
                      <span className="text-[10px] uppercase font-mono font-semibold text-slate-500">Max LOA</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-slate-900">{port.maxLOA}m</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Waves className="w-3.5 h-3.5 text-sky-700" />
                      <span className="text-[10px] uppercase font-mono font-semibold text-slate-500">Tidal Range</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-slate-900">{port.tidalRange}m</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Moon className="w-3.5 h-3.5 text-sky-700" />
                      <span className="text-[10px] uppercase font-mono font-semibold text-slate-500">Night Nav</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-slate-900">{port.nightNav ? 'Permitted' : 'Restricted'}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] uppercase font-mono font-semibold text-slate-500 mb-2">Vessel Feasibility Permissions</p>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    {['Handysize', 'Supramax', 'Panamax', 'Capesize'].map((cls) => {
                      const compatible = port[cls.toLowerCase()]
                      return (
                        <span
                          key={cls}
                          title={compatible ? `${cls} fully compatible` : `${cls} draft restricted`}
                          className={`text-[10px] py-1 rounded-md border font-semibold font-mono ${
                            compatible
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-600 border-rose-200'
                          }`}
                        >
                          {cls.slice(0, 2).toUpperCase()}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {port.lighterage && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-amber-800 leading-snug">
                      <strong className="font-semibold">Lighterage Required</strong>{port.lighterageCost ? ` (+$${port.lighterageCost}/MT)` : ''} — {port.lighterageNote || 'Sandheads lighterage'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  )
}
