import React from 'react'

export default function AnimatedCard({ children, className = '', delay = 0, hover = true, accent = false, shimmer = false, beam = false }) {
  return (
    <div
      className={`glass-card rounded-2xl p-5 ${hover ? 'glass-card-hover' : ''} ${accent ? 'glass-card-accent' : ''} ${shimmer ? 'shimmer-border' : ''} ${className}`}
      style={{ animation: `viewEnter 0.4s ease-out ${delay}s both` }}
    >
      {beam && <span className="border-beam" aria-hidden="true" />}
      {children}
    </div>
  )
}
