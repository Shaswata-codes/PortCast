import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Particles({ count = 2000 }) {
  const mesh = useRef()
  const mouse = useRef({ x: 0, y: 0 })

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20

      const colorChoice = Math.random()
      if (colorChoice < 0.4) {
        colors[i * 3] = 0.04
        colors[i * 3 + 1] = 0.7
        colors[i * 3 + 2] = 0.9
      } else if (colorChoice < 0.7) {
        colors[i * 3] = 0.02
        colors[i * 3 + 1] = 0.3
        colors[i * 3 + 2] = 0.5
      } else {
        colors[i * 3] = 0.1
        colors[i * 3 + 1] = 0.15
        colors[i * 3 + 2] = 0.3
      }

      sizes[i] = Math.random() * 2 + 0.5
    }

    return { positions, colors, sizes }
  }, [count])

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useFrame((state) => {
    if (!mesh.current) return
    const time = state.clock.getElapsedTime()
    const positions = mesh.current.geometry.attributes.position.array

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const x = positions[i3]
      const y = positions[i3 + 1]

      positions[i3 + 1] = y + Math.sin(time * 0.5 + x * 0.3) * 0.002
      positions[i3] = x + Math.cos(time * 0.3 + y * 0.2) * 0.001
    }

    mesh.current.geometry.attributes.position.needsUpdate = true
    mesh.current.rotation.y = mouse.current.x * 0.02
    mesh.current.rotation.x = mouse.current.y * 0.01
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function WaveGrid() {
  const mesh = useRef()

  useFrame((state) => {
    if (!mesh.current) return
    const time = state.clock.getElapsedTime()
    const positions = mesh.current.geometry.attributes.position.array

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 2]
      positions[i + 1] = Math.sin(x * 0.5 + time * 0.5) * 0.3 + Math.cos(z * 0.3 + time * 0.3) * 0.2
    }
    mesh.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -5, -5]}>
      <planeGeometry args={[50, 50, 64, 64]} />
      <meshBasicMaterial
        color="#0a1628"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  )
}

export default function OceanBackground() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <Particles count={1500} />
        <WaveGrid />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-ocean-950/80 via-transparent to-ocean-950/90 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(6,182,212,0.05),_transparent_70%)] pointer-events-none" />
    </div>
  )
}
