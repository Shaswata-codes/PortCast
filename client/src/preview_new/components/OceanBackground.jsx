import React, { useEffect, useRef } from 'react'

export default function OceanBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      const t = performance.now() / 1000
      const W = window.innerWidth
      const H = window.innerHeight
      const baseY = H * 0.9

      for (let layer = 0; layer < 2; layer++) {
        const amp = 8 + layer * 5
        const speed = 0.08 + layer * 0.03
        const yOff = baseY - layer * 32
        ctx.beginPath()
        for (let x = 0; x <= W; x += 16) {
          const y =
            yOff +
            Math.sin(x * 0.003 + t * speed + layer * 1.5) * amp +
            Math.cos(x * 0.006 - t * speed * 0.5 + layer) * (amp * 0.3)
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `rgba(2, 132, 199, ${0.035 - layer * 0.012})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Enterprise Daylight Ambient Washes */}
      <div className="absolute inset-0 bg-[#f2f6fb]" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-sky-400/[0.06] via-teal-400/[0.03] to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[450px] bg-gradient-to-tl from-sky-500/[0.04] to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(14,165,233,0.04),transparent)]" />

      {/* Gentle Mathematical Contour Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-60 pointer-events-none" />
    </div>
  )
}
