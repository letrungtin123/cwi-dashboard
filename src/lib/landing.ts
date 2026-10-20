// Public landing links shared by the dashboard (registration forms, survey QR).
export function getLandingUrl(pathAndQuery: string) {
  const configuredOrigin = import.meta.env.VITE_LANDING_BASE_URL?.trim().replace(/\/+$/, '')
  const landingOrigin = configuredOrigin || (import.meta.env.DEV ? 'http://localhost:5670' : window.location.origin)
  return `${landingOrigin}${pathAndQuery}`
}
