import React, { useMemo } from 'react'
import { MAP_W, MAP_H, LAT_TOP, LAT_BOT, LAND_PATHS } from '../data/worldLand'

const CHOKEPOINT_COORDS = {
  malacca: [101.3, 2.8, 'Malacca Strait'],
  singapore: [103.8, 1.3, 'Singapore Strait'],
  lombok: [115.75, -8.7, 'Lombok Strait'],
  sunda: [105.4, -6.0, 'Sunda Strait'],
  suez: [32.55, 30.0, 'Suez Canal'],
  'bab-el-mandeb': [43.4, 12.6, 'Bab-el-Mandeb'],
  hormuz: [56.5, 26.5, 'Strait of Hormuz'],
  'bay of bengal': [87.5, 15.0, 'Bay of Bengal'],
  torres: [142.2, -9.9, 'Torres Strait'],
  'strait of gibraltar': [-5.6, 35.9, 'Gibraltar'],
}

const SEVERITY_KEY_BY_NAME = [
  ['malacca', 'malacca'], ['singapore', 'malacca'], ['lombok', 'malacca'], ['sunda', 'malacca'],
  ['suez', 'red_sea'], ['bab-el-mandeb', 'red_sea'], ['red sea', 'red_sea'],
  ['hormuz', 'hormuz'],
  ['bay of bengal', 'bay_of_bengal'],
]

const SEVERITY_STYLE = {
  CRITICAL: '#e11d48',
  HIGH: '#d97706',
  MODERATE: '#0369a1',
  MEDIUM: '#0369a1',
  LOW: '#059669',
  UNKNOWN: '#64748b',
}

function project([lng, lat]) {
  return [(lng + 180) / 360 * MAP_W, (LAT_TOP - lat) / (LAT_TOP - LAT_BOT) * MAP_H]
}

function severityFor(name, alerts) {
  const key = SEVERITY_KEY_BY_NAME.find(([frag]) => name.toLowerCase().includes(frag))?.[1]
  if (!key) return 'UNKNOWN'
  const hit = (alerts || []).find((a) => a.chokepoint_key === key)
  return hit ? String(hit.severity || 'UNKNOWN').toUpperCase() : 'UNKNOWN'
}

export default function RouteMap({ route, origins = [], destinations = [], radarAlerts = [], radarAge }) {
  const geo = useMemo(() => {
    if (!route) {
      const GLOBAL = ['malacca', 'suez', 'bab-el-mandeb', 'hormuz', 'bay of bengal']
      const markers = GLOBAL.map((k, idx) => {
        const v = CHOKEPOINT_COORDS[k]
        return {
          key: k,
          idx,
          label: v[2],
          pt: project([v[0], v[1]]),
          sev: severityFor(v[2], radarAlerts),
        }
      })
      return { a: null, b: null, ctrl: null, originName: '', destName: '', markers }
    }
    const o = origins.find((p) => p.id === route.origin)
    const d = destinations.find((p) => p.id === route.destination)
    if (!o?.lat || !d?.lat) return null
    const a = project([o.lng, o.lat])
    const b = project([d.lng, d.lat])
    const mx = (a[0] + b[0]) / 2
    const my = (a[1] + b[1]) / 2
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const dist = Math.hypot(dx, dy) || 1
    const lift = Math.min(90, dist * 0.22)
    const ctrl = [mx - (dy / dist) * lift, my + (dx / dist) * lift]
    const markers = []
    const seen = new Set()
    for (const raw of route.chokePoints || []) {
      const name = String(raw).toLowerCase()
      const hit = Object.entries(CHOKEPOINT_COORDS).find(([k]) => name.includes(k))
      if (hit && !seen.has(hit[0])) {
        seen.add(hit[0])
        markers.push({
          key: hit[0],
          idx: markers.length,
          label: hit[1][2],
          pt: project([hit[1][0], hit[1][1]]),
          sev: severityFor(hit[1][2], radarAlerts),
        })
      }
    }
    return { a, b, ctrl, originName: o.name, destName: d.name, markers }
  }, [route, origins, destinations, radarAlerts])

  if (!geo) {
    return (
      <div className="h-full min-h-[260px] flex items-center justify-center text-xs font-mono text-slate-500">
        Loading trade lane geography...
      </div>
    )
  }

  return (
    <div className="relative">
      <svg id="chokepoint-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full rounded-lg bg-sky-50/60 border border-slate-100" role="img" aria-label={route ? `Route map ${route.originName}` : "Global chokepoint radar map"}>
        <defs>
          <pattern id="grat" width={MAP_W / 24} height={MAP_H / 12} patternUnits="userSpaceOnUse">
            <path d={`M ${MAP_W / 24} 0 L 0 0 0 ${MAP_H / 12}`} fill="none" stroke="rgba(11,31,58,0.12)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={MAP_W} height={MAP_H} fill="url(#grat)" />
        {LAND_PATHS.map((d, i) => (
          <path key={i} d={d} fill="#e2eef7" stroke="#b9cde0" strokeWidth="0.6" />
        ))}

        {geo.a && (
          <>
            <path
              d={`M ${geo.a[0]} ${geo.a[1]} Q ${geo.ctrl[0]} ${geo.ctrl[1]} ${geo.b[0]} ${geo.b[1]}`}
              fill="none"
              stroke="#0369a1"
              strokeWidth="2.2"
              strokeDasharray="6 4"
              strokeLinecap="round"
              opacity="0.85"
            />
            <circle cx={geo.a[0]} cy={geo.a[1]} r="5" fill="#0f172a" stroke="#fff" strokeWidth="1.6" />
            <circle cx={geo.b[0]} cy={geo.b[1]} r="5" fill="#0369a1" stroke="#fff" strokeWidth="1.6" />
            <text x={geo.a[0]} y={geo.a[1] - 10} textAnchor="middle" fontSize="13" fontWeight="600" fill="#0f172a">{geo.originName}</text>
            <text x={geo.b[0]} y={geo.b[1] - 10} textAnchor="middle" fontSize="13" fontWeight="600" fill="#0c4a6e">{geo.destName}</text>
          </>
        )}

        {geo.markers.map((m) => {
          const c = SEVERITY_STYLE[m.sev] || SEVERITY_STYLE.UNKNOWN
          const pulse = m.sev === 'CRITICAL' || m.sev === 'HIGH'
          return (
            <g key={m.key}>
              {pulse && <circle cx={m.pt[0]} cy={m.pt[1]} r="8" fill="none" stroke={c} strokeWidth="1.4" opacity="0.45" />}
              <circle cx={m.pt[0]} cy={m.pt[1]} r="4.4" fill={c} stroke="#fff" strokeWidth="1.3" />
              <text
                x={m.pt[0]}
                y={m.pt[1] + (m.idx % 2 === 0 ? -9 : 17)}
                textAnchor="middle"
                fontSize="12"
                fill="#334155"
                fontWeight="500"
                paintOrder="stroke"
                stroke="#f2f6fb"
                strokeWidth="3"
              >{m.label}</text>
            </g>
          )
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'].map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
            <span className="w-2 h-2 rounded-full" style={{ background: SEVERITY_STYLE[s] }} />
            {s}
          </span>
        ))}
        <span className="ml-auto text-[10px] font-mono text-slate-500 font-medium">
          Great-circle approximation{radarAge ? ` · radar ${radarAge}` : ''}
        </span>
      </div>
    </div>
  )
}
