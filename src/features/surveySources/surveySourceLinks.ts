import { getLandingUrl } from '@/lib/landing'

// Same rule as the backend and the database: lowercase letters, digits and inner
// hyphens, 1-48 characters.
export const SURVEY_SOURCE_CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/

// Quarter opened by a source link without a quarter: every link shared before links had one
// (they were made for the 2026Q4 campaign). Same value as on the landing page.
export const SOURCE_LINK_DEFAULT_VERSION = '2026Q4'

// Survey link of a source for one quarter. entry=qr opens that quarter's intro screen directly,
// with a fresh session. The 2026Q4 link keeps the form already printed on ads and QR codes.
export function surveySourceUrl(code: string, surveyVersion: string) {
  const quarter = surveyVersion === SOURCE_LINK_DEFAULT_VERSION ? '' : `&q=${encodeURIComponent(surveyVersion)}`
  return getLandingUrl(`/survey?entry=qr&src=${encodeURIComponent(code)}${quarter}`)
}

export function surveySourceQrFileName(code: string, surveyVersion: string) {
  return `ma-qr-khao-sat-${code}-${surveyVersion}.png`
}

// "2026Q3" -> "Q3/2026".
export function shortQuarterLabel(surveyVersion: string) {
  const match = /^(\d{4})Q([1-4])$/.exec(surveyVersion)
  return match ? `Q${match[2]}/${match[1]}` : surveyVersion
}

// Suggests a code from the source name: "VCCI Hồ Chí Minh" -> "vcci-ho-chi-minh".
export function suggestSurveySourceCode(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 48)
    .replace(/-+$/, '')
}
