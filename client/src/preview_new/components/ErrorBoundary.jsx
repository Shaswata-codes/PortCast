import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('View crashed:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-[1600px] mx-auto px-6 py-20 text-center">
          <p className="section-label justify-center mb-4">System notice</p>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">This view failed to load</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 font-mono">
            {String(this.state.error?.message || this.state.error).slice(0, 140)}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Retry view
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
