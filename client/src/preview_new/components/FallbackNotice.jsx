import React, { useState } from 'react'
import { DatabaseZap, RefreshCw } from 'lucide-react'

export default function FallbackNotice({ message, onRetry, compact = false }) {
  const [retrying, setRetrying] = useState(false)

  if (!message) return null

  const handleRetry = async () => {
    setRetrying(true)
    await onRetry?.()
    setRetrying(false)
  }

  return (
    <div className={`flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}>
      <DatabaseZap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      <span className="text-[11px] font-medium text-amber-800">
        Reference data — live engine unreachable ({message}); figures may be stale
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono font-medium text-amber-800 hover:text-amber-900 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
          Retry
        </button>
      )}
    </div>
  )
}
