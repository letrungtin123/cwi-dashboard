import type { NewsPageSettings, NewsSocialNetwork } from '@/types'

// "Tin tức" -> "Cài đặt": CWI's page on each network, in the order the post page shows them.
export const NEWS_SOCIAL_NETWORKS: NewsSocialNetwork[] = ['facebook', 'linkedin', 'youtube', 'zalo']

// The same list is checked again by the server (cwi-backend src/modules/news/newsValidation.ts).
export const NEWS_SOCIAL_SITES: Record<NewsSocialNetwork, { example: string; hosts: string[]; label: string }> = {
  facebook: { example: 'https://www.facebook.com/tentrang', hosts: ['facebook.com', 'fb.com', 'fb.me'], label: 'Facebook' },
  linkedin: { example: 'https://www.linkedin.com/company/tencongty', hosts: ['linkedin.com', 'lnkd.in'], label: 'LinkedIn' },
  youtube: { example: 'https://www.youtube.com/@tenkenh', hosts: ['youtube.com', 'youtu.be'], label: 'YouTube' },
  zalo: { example: 'https://zalo.me/1234567890', hosts: ['zalo.me'], label: 'Zalo OA' },
}

const URL_MAX = 500

// A pasted page link -> its https address ('' when empty), or null when it is not a page on
// that network ("facebook.com/cwi" -> "https://facebook.com/cwi"; the home page alone is refused).
export function normalizeSocialUrl(network: NewsSocialNetwork, value: string): string | null {
  const raw = value.trim()
  if (!raw) return ''
  let url: URL
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password) return null
  const host = url.hostname.toLowerCase()
  if (!NEWS_SOCIAL_SITES[network].hosts.some((site) => host === site || host.endsWith(`.${site}`))) return null
  if (!url.pathname.replace(/\/+$/, '')) return null
  url.protocol = 'https:'
  url.hash = ''
  return url.href.length <= URL_MAX ? url.href : null
}

export function socialUrlError(network: NewsSocialNetwork, value: string) {
  if (normalizeSocialUrl(network, value) !== null) return ''
  const { example, label } = NEWS_SOCIAL_SITES[network]
  return `Link chưa đúng. Hãy dán link trang ${label} của CWI, ví dụ ${example}`
}

export function samePageSettings(a: NewsPageSettings, b: NewsPageSettings) {
  return a.copyLink === b.copyLink
    && NEWS_SOCIAL_NETWORKS.every((network) => a.social[network].on === b.social[network].on && a.social[network].url.trim() === b.social[network].url.trim())
}

// The icons a reader sees: networks switched on with a working link, then the copy-link icon.
export function shownSocialNetworks(settings: NewsPageSettings) {
  return NEWS_SOCIAL_NETWORKS.filter((network) => settings.social[network].on && normalizeSocialUrl(network, settings.social[network].url))
}
