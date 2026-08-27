let deepLinkRouteId = null

export function setDeepLinkRouteId(id) {
  deepLinkRouteId = id
}

export function takeDeepLinkRouteId() {
  const v = deepLinkRouteId
  deepLinkRouteId = null
  return v
}
