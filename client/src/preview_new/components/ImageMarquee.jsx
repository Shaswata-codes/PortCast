import React from 'react'

const CORRIDOR_POINTS = [
  { src: '/img/hero_port.jpg', label: 'Paradip Deepwater Berths', tag: 'Berth Clearance' },
  { src: '/img/hero_ship.jpg', label: 'Vizag Outer Harbour Terminal', tag: 'Natural Harbour' },
  { src: '/img/containers.jpg', label: 'Bay of Bengal Deep Sea Transit', tag: 'Laden Route' },
  { src: '/img/port_cranes.jpg', label: 'Sandheads Lighterage Transit', tag: 'Tidal Sync' },
  { src: '/img/vessel_sea.jpg', label: 'Dhamra Capesize Discharging', tag: 'Bulk Terminal' },
]

export default function ImageMarquee() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 my-2">
      {CORRIDOR_POINTS.map((item, i) => (
        <figure
          key={i}
          className="group relative h-36 rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all"
        >
          <img
            src={item.src}
            alt={item.label}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-[9px] font-mono font-bold text-slate-800 uppercase tracking-wider shadow-sm">
              {item.tag}
            </span>
          </div>
          <figcaption className="absolute inset-x-0 bottom-0 p-2.5">
            <p className="text-xs font-semibold text-white leading-snug line-clamp-1">
              {item.label}
            </p>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
