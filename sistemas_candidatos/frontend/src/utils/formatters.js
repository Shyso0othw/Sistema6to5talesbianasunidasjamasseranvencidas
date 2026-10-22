export function capitalizeWords(str) {
  if (!str) return ''
  return str.replace(/(^|\s)(\S)/g, (_, prefix, char) => prefix + char.toUpperCase())
}

export function stripNonAlpha(value) {
  return value.replace(/[^a-zA-ZáéíóúÁÉÓÍÚñÑüÜ\s]/g, '')
}

export function stripNonDigits(str) {
  return str.replace(/\D/g, '')
}

export function formatDNI(value) {
  const digits = stripNonDigits(value).slice(0, 8)
  if (!digits) return ''
  const parts = []
  if (digits.length > 2) parts.push(digits.slice(0, 2))
  if (digits.length > 2) parts.push(digits.slice(2, 5))
  if (digits.length > 5) parts.push(digits.slice(5, 8))
  if (digits.length <= 2) return digits
  return parts.join('.')
}

export function unformatDNI(value) {
  return stripNonDigits(value)
}

export function isValidDNI(value) {
  return stripNonDigits(value).length === 8
}

export function formatCUIL(value) {
  const digits = stripNonDigits(value).slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 2) return digits
  if (digits.length <= 10) return digits.slice(0, 2) + '-' + digits.slice(2)
  return digits.slice(0, 2) + '-' + digits.slice(2, 10) + '-' + digits.slice(10, 11)
}

export function unformatCUIL(value) {
  return stripNonDigits(value)
}

export function isValidCUIL(value) {
  return stripNonDigits(value).length === 11
}

// Phone numbers are identifiers: preserve exact input, including + and spaces.
export function formatPhone(value) { return value ?? '' }
export function unformatPhone(value) { return value ?? '' }

export function getMinDateOfBirth() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 11)
  return d.toISOString().split('T')[0]
}

export function isValidDateOfBirth(value) {
  if (!value) return false
  const dob = new Date(value)
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 11)
  return dob <= minDate
}

export function formatCP(value) {
  return stripNonDigits(value).slice(0, 4)
}

export function isValidCP(value) {
  return stripNonDigits(value).length === 4
}

export function buildAddress(data) {
  return JSON.stringify(data)
}

export function parseAddress(str) {
  if (!str) return null
  try {
    const parsed = JSON.parse(str)
    if (parsed && typeof parsed === 'object' && parsed.calle) return parsed
    return null
  } catch {
    return null
  }
}

export function isNumericKey(e) {
  const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
  if (allowed.includes(e.key)) return true
  if (e.ctrlKey || e.metaKey) return true
  return /^\d$/.test(e.key)
}
