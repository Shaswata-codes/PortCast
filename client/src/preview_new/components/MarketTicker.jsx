import React, { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import { marketTickerData } from '../data/mockData'
import { fetchDashboard, invalidate, cacheTime, secsAgo } from '../services/api'

const fmt = (n, digits = 0) =>
  Number(n).toLocaleString('en-US', { maximumFractionDigits: digits })

function buildTicker(dash) {
  if (!dash) return null
  const mi = dash.marketIndicators || {}
  const radar = dash.mlRadar
  const items = []

  for (const [key, label] of [['bdi', 'BDI'], ['bci', 'BCI'], ['bpi', 'BPI'], ['bsi', 'BSI']]) {
    const idx = mi[key]
    if (!idx) continue
    const pct = Number(idx.changePct)
    items.push({
      label,
      value: fmt(idx.value),
      change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
      trend: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'neutral',
    })
  }
  if (mi.vlsfo) items.push({ label: 'VLSFO', value: `$${fmt(mi.vlsfo.value, 2)}`, change: 'live', trend: 'neutral' })
  if (mi.mgo) items.push({ label: 'MGO', value: `$${fmt(mi.mgo.value, 2)}`, change: 'live', trend: 'neutral' })
  if (radar && radar.risk_index != null) {
    items.push({
      label: 'Risk Index',
      value: `${Number(radar.risk_index).toFixed(1)}/100`,
      change: `x${Number(radar.rate_multiplier || 1).toFixed(3)}`,
      trend: radar.risk_index >= 60 ? 'down' : 'neutral',
    })
  }
  items.push({ label: 'System', value: 'LIVE', change: 'API OK', trend: 'up' })
  return items.length > 2 ? items : null
}

export default function MarketTicker() {
  const [ticker, setTicker] = useState(marketTickerData)
  const [flash, setFlash] = useState({})
  const [refreshing, setRefreshing] = useState(false)
  const [, setTick] = useState(0)
  const prevVals = React.useRef({})

  const load = (force) => {
    if (force) invalidate('dashboard')
    return fetchDashboard().then((dash) => {
      const items = buildTicker(dash)
      if (!items) return
      const next = {}
      items.forEach((it) => {
        if (prevVals.current[it.label] !== undefined && prevVals.current[it.label] !== it.value) {
          next[`${it.label}-${it.value}`] = Date.now()
        }
        prevVals.current[it.label] = it.value
      })
      setFlash(next)
      setTimeout(() => setFlash({}), 1200)
      setTicker(items)
    })
  }

  useEffect(() => {
    let alive = true
    load(false)
    const iv = setInterval(() => load(true), 120_000)
    const tv = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => { alive = false; clearInterval(iv); clearInterval(tv) }
  }, [])

  const updated = (() => {
    const ts = cacheTime('dashboard')
    return ts ? secsAgo(ts) : null
  })()

  const handleRefresh = async () => {
    setRefreshing(true)
    await load(true)
    setRefreshing(false)
  }

  const tickerContent = [...ticker, ...ticker]

  return (
    <div className="bg-white border-b border-slate-200/80 overflow-hidden relative" style={{ WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 4%, black 96%, transparent 100%)", maskImage: "linear-gradient(90deg, transparent 0%, black 4%, black 96%, transparent 100%)" }}>
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 pointer-events-none" aria-hidden="true">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-700">Live</span>
      </div>
      <div className="flex animate-ticker-scroll hover:[animation-play-state:paused]">
        {tickerContent.map((item, idx) => {
          const Icon = item.trend === 'up' ? TrendingUp : item.trend === 'down' ? TrendingDown : Minus
          const colorClass = item.trend === 'up' ? 'text-emerald-600' : item.trend === 'down' ? 'text-rose-600' : 'text-slate-600'

          return (
            <div
              key={idx}
              style={
                flash[`${item.label}-${item.value}`]
                  ? { backgroundColor: 'rgba(2,132,199,0.14)', transition: 'background-color 1.2s ease' }
                  : { transition: 'background-color 1.2s ease' }
              }
              className="flex items-center gap-2 px-5 py-2 border-r border-slate-200/70 whitespace-nowrap"
            >
              <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">{item.label}</span>
              <span className="text-sm font-bold text-slate-900 num">{item.value}</span>
              <span className={`flex items-center gap-0.5 text-xs font-bold ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
                {item.change}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
