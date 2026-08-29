import React, { useEffect, useRef } from 'react'

export default function OceanBackground() {
  const canvasRef = useRef(null)
  const videoARef = useRef(null)
  const videoBRef = useRef(null)
  const CROSSFADE_SEC = 0.65

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    let w, h

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const t = performance.now() / 1000
      const W = window.innerWidth
      const H = window.innerHeight
      const baseY = H * 0.88

      for (let layer = 0; layer < 3; layer++) {
        const amp = 12 + layer * 8
        const speed = 0.12 + layer * 0.05
        const yOff = baseY - layer * 42
        ctx.beginPath()
        for (let x = 0; x <= W; x += 8) {
          const y =
            yOff +
            Math.sin(x * 0.004 + t * speed + layer * 1.7) * amp +
            Math.cos(x * 0.009 - t * speed * 0.7 + layer) * (amp * 0.4)
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `rgba(2, 132, 199, ${0.04 - layer * 0.01})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  // Seamless video crossfade: fade B in over last CROSSFADE_SEC, then swap
  useEffect(() => {
    const a = videoARef.current
    const b = videoBRef.current
    if (!a || !b) return
    let raf
    const tick = () => {
      if (a.duration && !a.paused) {
        const remain = a.duration - a.currentTime
        if (remain < CROSSFADE_SEC) {
          const t = 1 - remain / CROSSFADE_SEC
          b.style.opacity = String(Math.min(1, t))
          if (remain < 0.04) {
            a.currentTime = 0
            b.style.opacity = '0'
          }
        } else {
          b.style.opacity = '0'
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Seamless dual-video crossfade loop */}
      <video
        ref={videoARef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover opacity-[0.38] filter saturate-[1.25] contrast-[1.08] [object-position:62%_center]"
        src="/keyframes/hero_voyage_clean.mp4"
      />
      <video
        ref={videoBRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover filter saturate-[1.25] contrast-[1.08] opacity-0 transition-none pointer-events-none [object-position:62%_center]"
        style={{ opacity: 0 }}
        src="/keyframes/hero_voyage_clean.mp4"
      />

      {/* Daylight scrim */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f2f6fb]/[0.08] to-[#f2f6fb]/[0.18]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.06),rgba(255,255,255,0))]" />

      {/* Gentle Mathematical Wave Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-50" />
    </div>
  )
}
