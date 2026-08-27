import axios from 'axios'
import { API_BASE_URL } from '../../utils/constants'

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
})

const cache = new Map()
const CACHE_TTL = 60_000
const lastErrors = new Map()

export function invalidate(key) {
  if (key) cache.delete(key)
  else cache.clear()
}

export function cacheTime(key) {
  const hit = cache.get(key)
  return hit ? hit.ts : null
}

export function lastError(key) {
  return lastErrors.get(key) || null
}

async function cachedGet(key, url) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data
  try {
    const { data } = await http.get(url)
    cache.set(key, { ts: Date.now(), data })
    lastErrors.delete(key)
    return data
  } catch (e) {
    lastErrors.set(key, e?.response ? `API ${e.response.status}` : e?.message || 'Network error')
    return null
  }
}

async function post(url, body, errKey) {
  try {
    const { data } = await http.post(url, body)
    lastErrors.delete(errKey || url)
    return data
  } catch (e) {
    lastErrors.set(errKey || url, e?.response ? `API ${e.response.status}` : e?.message || 'Network error')
    return null
  }
}

export const fetchDashboard = () => cachedGet('dashboard', '/dashboard')
export const fetchPorts = () => cachedGet('ports', '/ports')
export const fetchRoutes = () => cachedGet('routes', '/routes')
export const fetchVessels = () => cachedGet('vessels', '/vessels')
export const fetchRisk = () => cachedGet('risk', '/risk')

export const fetchForecast = (routeId) => post('/forecast', { routeId }, 'forecast')
export const fetchOptimize = ({ routeId, parcelSizeMT, bunkerPrice }) =>
  post('/optimize', { routeId, parcelSizeMT, bunkerPrice }, 'optimize')
export const fetchPortComparison = ({ origin, parcel, bunker }) => {
  const key = `portcmp-${origin}-${parcel}-${bunker}`
  return cachedGet(key, `/optimize/ports?origin=${encodeURIComponent(origin)}&parcel=${parcel}&bunker=${bunker}`)
}

export const fetchSimulate = (routeId, scenario) =>
  post('/simulate', { routeId, scenario }, 'simulate')

export function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return ''
  const mins = Math.max(0, Math.round(diff / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

export function secsAgo(ts) {
  if (!ts) return null
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.round(s / 60)}m ago`
}
