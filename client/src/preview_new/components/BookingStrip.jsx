import React from 'react'

function cellColor(dev, neutral, rel) {
  if (neutral) {
    const tint = 0.42 + rel * 0.38
    return { bg: `rgba(71,85,105,${Math.min(0.85, tint).toFixed(2)})`, label: 'Flat outlook' }
  }
  const clamped = Math.max(-0.05, Math.min(0.05, dev))
  const intensity = 0.32 + (Math.abs(clamped) / 0.05) * 0.55
  return clamped < 0
    ? { bg: `rgba(2,132,199,${Math.min(0.92, intensity).toFixed(2)})`, label: `${(dev * 100).toFixed(1)}% vs today` }
    : { bg: `rgba(234,88,12,${Math.min(0.92, intensity).toFixed(2)})`, label: `+${(dev * 100).toFixed(1)}% vs today` }
}

export default function BookingStrip({ trajectory, todayRate, selectedDay, onSelectDay }) {
  if (!trajectory?.length) {
    return (
      <div>
        <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">Booking window · next 30 days</p>
        <div className="flex gap-[3px]">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="h-9 flex-1 rounded-[3px] bg-slate-100" />
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 font-mono">Live ML trajectory unavailable — showing flat window</p>
      </div>
    )
  }

  const rates = trajectory.map((t) => t.expected_rate)
  const spread = (Math.max(...rates) - Math.min(...rates)) / (todayRate || 1)
  const neutral = spread < 0.001
  const lo = Math.min(...rates)
  const hi = Math.max(...rates)

  const optimalIdx = rates.indexOf(Math.min(...rates))
  const todayIdx = trajectory.findIndex((t) => t.day === 0)
  const todayFallbackIdx = todayIdx >= 0 ? todayIdx : 0

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Booking window · next 30 days</p>
        <p className="text-[10px] font-mono text-slate-400">
          {neutral ? 'Low dispersion — timing matters less' : 'Blue = cheaper · Orange = dearer · Dotted = today'}
        </p>
      </div>
      <div className="relative flex gap-[2px]">
        {trajectory.map((t, i) => {
          const dev = (t.expected_rate - todayRate) / (todayRate || 1)
          const rel = (t.expected_rate - lo) / (hi - lo || 1)
          const { bg, label } = cellColor(dev, neutral, rel)
          const isSel = selectedDay === t.day
          const isOpt = i === optimalIdx
          return (
            <button
              key={t.day}
              type="button"
              onClick={() => onSelectDay && onSelectDay(t.day, t.expected_rate)}
              title={`Day ${t.day} · $${t.expected_rate.toFixed(2)}/MT — ${label}`}
              aria-label={`Book day ${t.day}, rate ${t.expected_rate.toFixed(2)} dollars per tonne`}
              aria-pressed={isSel}
              className={`group relative h-10 flex-1 rounded-sm transition-all hover:scale-y-110 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${isSel ? 'ring-2 ring-sky-600 ring-offset-1 z-10' : ''}`}
              style={{ backgroundColor: bg }}
            >
              {isOpt && (
                <span className="absolute left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-wider px-1 rounded bg-emerald-500 text-white shadow-sm pointer-events-none" style={{ top: '-10px' }}>★</span>
              )}
              <span className="absolute inset-x-0 bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-white shadow-lg whitespace-nowrap">
                  D+{t.day} · ${t.expected_rate.toFixed(2)}
                </span>
              </span>
            </button>
          )
        })}
        {todayFallbackIdx >= 0 && (
          <span
            className="absolute bottom-0 w-px bg-slate-900/70 pointer-events-none"
            style={{ left: `calc(${(todayFallbackIdx / trajectory.length) * 100}% + 0px)`, top: '-4px' }}
            aria-hidden="true"
          >
            <span className="absolute -translate-x-1/2 text-[8px] font-bold uppercase tracking-wider px-1 rounded bg-slate-900 text-white" style={{ left: '0', top: '0' }}>T</span>
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 gap-2">
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-700">D+1 ${Math.min(...rates).toFixed(2)} min</span>
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">today ${todayRate?.toFixed ? todayRate.toFixed(2) : todayRate}</span>
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-700">D+30 ${Math.max(...rates).toFixed(2)} max</span>
      </div>
    </div>
  )
}
