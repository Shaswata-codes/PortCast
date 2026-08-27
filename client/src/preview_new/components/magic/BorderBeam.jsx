import React from 'react'

export default function BorderBeam({ size = 180, duration = 4, colorFrom = '#0284c7', colorTo = '#0d9488', borderWidth = 1.5, className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
      style={{
        padding: `${borderWidth}px`,
        background: `conic-gradient(from var(--beam-angle, 0deg) at 50% 50%, transparent 55%, ${colorFrom} 70%, ${colorTo} 82%, transparent 94%)`,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        animation: `beamRotate ${duration}s linear infinite`,
        ...style,
      }}
    />
  )
}
