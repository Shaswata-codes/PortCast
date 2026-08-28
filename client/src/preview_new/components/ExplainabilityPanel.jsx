import React, { useEffect, useState } from 'react'
import { Sparkles, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { fetchExplanation } from '../services/api'

const groupColors = {
  Momentum:    { bar: 'bg-sky-500',    chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  Trend:       { bar: 'bg-emerald-500',chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Volatility:  { bar: 'bg-amber-500',  chip: 'bg-amber-50 text-amber-700 border-amber-200' },
}

export default function ExplainabilityPanel({ routeId, baseRate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!routeId) return
    let alive = true
    setLoading(true)
    setErr(null)
    fetchExplanation(routeId)
      .then((d) => {
        if (!alive) return
        if (d) setData(d)
        else setErr('Unable to compute feature explanation')
      })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [routeId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Computing feature contributions…
      </div>
    )
  }
  if (err) {
    return <p className="text-xs text-rose-600 font-mono">Explain endpoint unreachable: {err}</p>
  }
  if (!data) return null

  const max = Math.max(...data.drivers.map((d) => Math.abs(d.contribution_pct)), 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-sky-700" />
        <h3 className="text-sm font-bold text-slate-900">Why this forecast?</h3>
        <span className="text-[10px] font-mono text-slate-500 ml-auto uppercase tracking-wider font-medium">SHAP-lite · LightGBM gain</span>
      </div>

      <div className="space-y-2.5">
        {data.drivers.map((d) => {
          const Icon = d.direction === 'up' ? TrendingUp : TrendingDown
          const cls = groupColors[d.group] || groupColors.Momentum
          const widthPct = (Math.abs(d.contribution_pct) / max) * 100
          const sign = d.contribution_pct >= 0 ? '+' : ''
          return (
            <div key={d.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className={`inline-block w-2 h-2 rounded-sm ${cls.bar}`} aria-hidden="true" />
                  {d.label}
                </span>
                <span className={`flex items-center gap-1 font-mono font-bold ${d.direction === 'up' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  <Icon className="w-3 h-3" />
                  {sign}{d.contribution_pct}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${cls.bar} rounded-full transition-all duration-700`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>5 of {data.allFeatures.length} features shown · base ${Number(data.baseRate || baseRate).toFixed(2)}/MT</span>
        <span className="uppercase tracking-wider">deterministic · per route</span>
      </div>
    </div>
  )
}
