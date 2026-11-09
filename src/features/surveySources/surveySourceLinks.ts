import { getLandingUrl } from '@/lib/landing'

// Same rule as the backend and the database: lowercase letters, digits and inner
// hyphens, 1-48 characters.
export const SURVEY_SOURCE_CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/

// Survey link of a source. entry=qr opens the survey directly with a fresh session.
export function surveySourceUrl(code: string) {
  return getLandingUrl(`/survey?entry=qr&src=${encodeURIComponent(code)}`)
}

export function surveySourceQrFileName(code: string) {
  return `ma-qr-khao-sat-${code}.png`
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
