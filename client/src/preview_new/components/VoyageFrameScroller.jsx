import React, { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Ship, Compass, Anchor, Gauge, Play, Pause } from 'lucide-react'

const TOTAL_FRAMES = 140
const FRAME_PATH = (idx) => `/frames/frame_${String(idx).padStart(3, '0')}.webp`
const FALLBACK_FRAME_PATH = (idx) => `/frames/frame_${String(idx).padStart(3, '0')}.jpg`

export default function VoyageFrameScroller() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [imagesLoaded, setImagesLoaded] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const imagesRef = useRef([])
  const currentFrameRef = useRef(1)

  // Scroll tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  // Frame index mapped to scroll progress
  const frameIndex = useTransform(smoothProgress, [0, 1], [1, TOTAL_FRAMES])

  // Preload frames
  useEffect(() => {
    let loaded = 0
    const images = []

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image()
      img.src = FRAME_PATH(i)
      img.onload = () => {
        loaded++
        setImagesLoaded(loaded)
        if (loaded >= Math.min(25, TOTAL_FRAMES)) {
          setIsReady(true)
        }
      }
      img.onerror = () => {
        // Try JPG fallback if webp fails
        img.src = FALLBACK_FRAME_PATH(i)
        img.onload = () => {
          loaded++
          setImagesLoaded(loaded)
          if (loaded >= Math.min(25, TOTAL_FRAMES)) setIsReady(true)
        }
      }
      images.push(img)
    }

    imagesRef.current = images
  }, [])

  // Draw frame on canvas
  const renderFrame = (idx) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const imgIndex = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(idx))) - 1
    const img = imagesRef.current[imgIndex]

    if (img && img.complete && img.naturalWidth > 0) {
      const cw = canvas.width
      const ch = canvas.height
      const iw = img.naturalWidth
      const ih = img.naturalHeight

      // Object fit cover
      const hRatio = cw / iw
      const vRatio = ch / ih
      const ratio = Math.max(hRatio, vRatio)
      const centerShiftX = (cw - iw * ratio) / 2
      const centerShiftY = (ch - ih * ratio) / 2

      ctx.clearRect(0, 0, cw, ch)
      ctx.drawImage(img, 0, 0, iw, ih, centerShiftX, centerShiftY, iw * ratio, ih * ratio)
    }
  }

  // Handle Resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      renderFrame(currentFrameRef.current)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isReady])

  // Subscribe to spring scroll
  useEffect(() => {
    const unsubscribe = frameIndex.on('change', (latest) => {
      if (!isPlaying) {
        currentFrameRef.current = latest
        renderFrame(latest)
      }
    })
    return () => unsubscribe()
  }, [frameIndex, isPlaying])

  // Optional auto-play loop
  useEffect(() => {
    if (!isPlaying) return
    let animId
    let frame = currentFrameRef.current

    const loop = () => {
      frame = (frame % TOTAL_FRAMES) + 0.6
      currentFrameRef.current = frame
      renderFrame(frame)
      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [isPlaying])

  const progressPercent = Math.round((imagesLoaded / TOTAL_FRAMES) * 100)

  return (
    <div ref={containerRef} className="relative h-[260vh] w-full bg-slate-950 text-white rounded-3xl overflow-hidden my-10 shadow-2xl border border-slate-800">
      {/* Sticky Frame Scrub Container */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
        {/* HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: isReady ? 1 : 0.2 }}
        />

        {/* Ambient Dark Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/70 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none" />

        {/* Loading Progress Pill */}
        {!isReady && (
          <div className="absolute z-20 flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900/90 border border-slate-700 backdrop-blur-md">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-slate-300">
              Loading Voyage Frames ({progressPercent}%)
            </span>
          </div>
        )}

        {/* Floating Scrollytelling Telemetry Overlay */}
        <div className="absolute inset-0 z-10 p-6 md:p-12 flex flex-col justify-between pointer-events-none">
          {/* Top HUD Bar */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-700/80 px-4 py-2 rounded-full backdrop-blur-md shadow-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-200">
                Live Voyage Scrubber · Capesize Industrial Transit
              </span>
            </div>

            {/* Play/Pause Scrub Mode Toggle */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-medium px-4 py-2 rounded-full transition-all shadow-md active:scale-95"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Auto-Cruise' : 'Auto Play'}</span>
            </button>
          </div>

          {/* Dynamic Storytelling Cards synced to Scroll */}
          <div className="max-w-xl space-y-4 pointer-events-auto">
            <motion.div
              style={{
                opacity: useTransform(smoothProgress, [0, 0.1, 0.3, 0.4], [1, 1, 0.2, 0]),
                y: useTransform(smoothProgress, [0, 0.3], [0, -20]),
              }}
              className="bg-slate-900/85 border border-slate-800 p-6 rounded-2xl backdrop-blur-xl shadow-xl"
            >
              <div className="flex items-center gap-2 text-sky-400 text-xs font-mono mb-2">
                <Anchor className="w-4 h-4" />
                <span>PHASE 1 · BERTH DEPARTURE & SANDHEADS CLEARANCE</span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Vessel Unmooring & Deepwater Exit
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Tugboat escorts initiate safe channel transit. PortCast draft sensors monitor Sandheads 8.5m tidal gates in real time to avoid costly grounding or lighterage delays.
              </p>
            </motion.div>

            <motion.div
              style={{
                opacity: useTransform(smoothProgress, [0.35, 0.45, 0.7, 0.8], [0, 1, 1, 0]),
                y: useTransform(smoothProgress, [0.35, 0.7], [20, -20]),
              }}
              className="bg-slate-900/85 border border-slate-800 p-6 rounded-2xl backdrop-blur-xl shadow-xl"
            >
              <div className="flex items-center gap-2 text-teal-400 text-xs font-mono mb-2">
                <Compass className="w-4 h-4" />
                <span>PHASE 2 · BAY OF BENGAL OPTIMIZATION</span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Fuel Burn & Weather Routing
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Machine learning forecast synchronizes vessel cruising speed with Bay of Bengal monsoon swells, cutting VLSFO consumption by 14% across the 2,400 NM voyage.
              </p>
            </motion.div>

            <motion.div
              style={{
                opacity: useTransform(smoothProgress, [0.75, 0.85, 1, 1], [0, 1, 1, 1]),
                y: useTransform(smoothProgress, [0.75, 1], [20, 0]),
              }}
              className="bg-slate-900/85 border border-slate-800 p-6 rounded-2xl backdrop-blur-xl shadow-xl"
            >
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono mb-2">
                <Gauge className="w-4 h-4" />
                <span>PHASE 3 · DESTINATION PORT LOCK-IN</span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Optimal Fixture Arrival & Berth Securing
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Arrival locked at minimum demurrage window. Net voyage savings estimated at <span className="font-bold text-emerald-400">$38,500</span> vs. spot peak market.
              </p>
            </motion.div>
          </div>

          {/* Bottom Interactive Prompt */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 pointer-events-auto">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Ship className="w-4 h-4 text-sky-400" />
              <span>Scroll down to scrub voyage frames</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-sky-500 to-teal-400"
                  style={{ width: useTransform(smoothProgress, (p) => `${p * 100}%`) }}
                />
              </div>
              <span className="text-xs font-mono text-sky-400">
                Frame Scrub Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
