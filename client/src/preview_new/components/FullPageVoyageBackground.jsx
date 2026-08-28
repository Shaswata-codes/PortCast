import React, { useEffect, useRef, useState } from 'react'
import { useScroll, useSpring, useTransform } from 'framer-motion'

const TOTAL_FRAMES = 140
const CROSSFADE_FRAMES = 12
const WATERMARK_CROP = 0.11
const FRAME_PATH = (idx) => `/frames/frame_${String(idx).padStart(3, '0')}.webp`
const FALLBACK_FRAME_PATH = (idx) => `/frames/frame_${String(idx).padStart(3, '0')}.jpg`

export default function FullPageVoyageBackground() {
  const canvasRef = useRef(null)
  const [imagesLoaded, setImagesLoaded] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const imagesRef = useRef([])
  const currentFrameRef = useRef(1)

  // Track global page scroll
  const { scrollYProgress } = useScroll()

  // Spring physics for silky, inertia-based frame scrubbing
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 75,
    damping: 24,
    restDelta: 0.0005,
  })

  const frameIndex = useTransform(smoothProgress, [0, 1], [1, TOTAL_FRAMES])

  // Preload all 140 frames in background
  useEffect(() => {
    let loaded = 0
    const images = []

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image()
      img.src = FRAME_PATH(i)
      img.onload = () => {
        loaded++
        setImagesLoaded(loaded)
        if (loaded >= Math.min(15, TOTAL_FRAMES)) {
          setIsReady(true)
        }
      }
      img.onerror = () => {
        img.src = FALLBACK_FRAME_PATH(i)
        img.onload = () => {
          loaded++
          setImagesLoaded(loaded)
          if (loaded >= Math.min(15, TOTAL_FRAMES)) setIsReady(true)
        }
      }
      images.push(img)
    }

    imagesRef.current = images
  }, [])

  const drawCover = (ctx, cw, ch, img) => {
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const hRatio = cw / iw
    const vRatio = ch / ih
    const baseRatio = Math.max(hRatio, vRatio)
    const ratio = baseRatio * (1 + WATERMARK_CROP * 0.42)
    const centerShiftX = (cw - iw * ratio) / 2 - iw * ratio * WATERMARK_CROP * 0.36
    const centerShiftY = (ch - ih * ratio) / 2
    ctx.drawImage(img, 0, 0, iw, ih, centerShiftX, centerShiftY, iw * ratio, ih * ratio)
  }

  // Canvas paint — seamless loop via crossfade of last ↔ first frames
  const renderFrame = (idx) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cw = canvas.width
    const ch = canvas.height
    const clamped = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(idx)))
    const zoneStart = TOTAL_FRAMES - CROSSFADE_FRAMES

    ctx.clearRect(0, 0, cw, ch)
    if (clamped > zoneStart) {
      const t = (clamped - zoneStart) / CROSSFADE_FRAMES
      const tailImg = imagesRef.current[clamped - 1]
      const headIdx = Math.min(CROSSFADE_FRAMES - 1, Math.floor(t * CROSSFADE_FRAMES))
      const headImg = imagesRef.current[headIdx]
      if (tailImg?.complete && tailImg.naturalWidth > 0) drawCover(ctx, cw, ch, tailImg)
      if (headImg?.complete && headImg.naturalWidth > 0) {
        ctx.globalAlpha = t
        drawCover(ctx, cw, ch, headImg)
        ctx.globalAlpha = 1
      }
    } else {
      const img = imagesRef.current[clamped - 1]
      if (img?.complete && img.naturalWidth > 0) drawCover(ctx, cw, ch, img)
    }
  }

  // Handle Resize & Retina DPI
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      renderFrame(currentFrameRef.current)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isReady])

  // Sync scroll to frame render
  useEffect(() => {
    const unsubscribe = frameIndex.on('change', (latest) => {
      currentFrameRef.current = latest
      renderFrame(latest)
    })
    return () => unsubscribe()
  }, [frameIndex])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Full-Screen Canvas Scrubbing Video Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
        style={{
          opacity: isReady ? 1 : 0,
          filter: 'contrast(1.06) brightness(1.03) saturate(1.22)',
        }}
      />

      {/* Fallback HTML5 Video */}
      {!isReady && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80"
          src="/keyframes/hero_voyage_clean.mp4"
        />
      )}

      {/* Subtle enterprise daylight scrim for crisp foreground legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f2f6fb]/[0.08] to-[#f2f6fb]/[0.35] pointer-events-none" />
    </div>
  )
}
