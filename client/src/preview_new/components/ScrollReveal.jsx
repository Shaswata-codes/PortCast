import React from 'react'

export default function ScrollReveal({ children, className = '', delay = 0, stagger = false }) {
  if (stagger) {
    return (
      <div className={className} style={{ animation: `viewEnter 0.4s ease-out ${delay}s both` }}>
        {children}
      </div>
    )
  }
  return (
    <div className={className} style={{ animation: `viewEnter 0.4s ease-out ${delay}s both` }}>
      {children}
    </div>
  )
}

export function RevealItem({ children, className = '' }) {
  return <div className={className}>{children}</div>
}
