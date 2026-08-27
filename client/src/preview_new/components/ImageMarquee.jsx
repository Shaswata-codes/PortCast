import React from 'react'

const IMAGES = [
  { src: '/img/hero_port.jpg', label: 'Gantry cranes at berth' },
  { src: '/img/hero_ship.jpg', label: 'Terminal yard from above' },
  { src: '/img/containers.jpg', label: 'Loaded vessel underway' },
  { src: '/img/port_cranes.jpg', label: 'Ocean transit' },
  { src: '/img/vessel_sea.jpg', label: 'Port workforce' },
]

export default function ImageMarquee() {
  const track = [...IMAGES, ...IMAGES]
  return (
    <div className="relative overflow-hidden -mx-4 sm:-mx-6" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 w-24 sm:w-32 bg-gradient-to-r from-[#f2f6fb] via-[#f2f6fb]/70 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 sm:w-32 bg-gradient-to-l from-[#f2f6fb] via-[#f2f6fb]/70 to-transparent z-10 pointer-events-none" />
      <div className="marquee-track py-1 pr-[18px]">
        {track.map((img, i) => (
          <figure
            key={i}
            className="relative shrink-0 w-72 h-44 rounded-2xl overflow-hidden border border-white shadow-md"
          >
            <img
              src={img.src}
              alt=""
              className="w-full h-full object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 px-3 py-2 text-[11px] font-medium text-white bg-gradient-to-t from-[#0b1f3a]/80 to-transparent">
              {img.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
