import { useEffect, useRef } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

export default function NumberTicker({ value, prefix = '', suffix = '', decimals = 0, className = '' }) {
  const ref = useRef(null)
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0 : Number(value) || 0
  const spring = useSpring(numericValue, { stiffness: 80, damping: 18 })
  const display = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`)

  useEffect(() => { spring.set(numericValue) }, [numericValue, spring])

  return <motion.span ref={ref} className={className}>{display}</motion.span>
}
