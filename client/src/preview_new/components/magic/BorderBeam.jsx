export default function BorderBeam({ size = 180, duration = 4, colorFrom = '#0284c7', colorTo = '#0d9488', borderWidth = 1, className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
      style={{
        padding: `${borderWidth}px`,
        background: `linear-gradient(135deg, ${colorFrom}33 0%, ${colorTo}22 50%, transparent 100%)`,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        ...style,
      }}
    />
  )
}
