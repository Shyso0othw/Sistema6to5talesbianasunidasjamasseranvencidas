/** Catalogs consume complete arrays; REST stays paginated. Chat uses its own cursor. */
let refreshPending = null

function tokenStore() {
  return localStorage.getItem('token') ? localStorage : sessionStorage
}

async function renewToken() {
  if (!refreshPending) {
    refreshPending = (async () => {
      const storage = tokenStore()
      const refresh = storage.getItem('refresh')
      if (!refresh) return null
      const response = await globalThis.fetch('/api/login/refresh/', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({refresh}),
      })
      if (!response.ok) return null
      const data = await response.json()
      storage.setItem('token', data.access)
      if (data.refresh) storage.setItem('refresh', data.refresh)
      window.dispatchEvent(new Event('session-token-refreshed'))
      return data.access
    })().finally(() => { refreshPending = null })
  }
  return refreshPending
}

export async function apiFetch(input, options = {}) {
  const origin = globalThis.location.origin
  const url = new URL(input, origin)
  if (url.origin !== origin || !url.pathname.startsWith('/api/')) {
    return globalThis.fetch(input, options)
  }
  const headers = new Headers(options.headers)
  const token = tokenStore().getItem('token')
  if (token && !url.pathname.startsWith('/api/login/')) headers.set('Authorization', `Bearer ${token}`)
  let requestOptions = {...options, headers}
  let response = await globalThis.fetch(input, requestOptions)
  if (response.status === 401 && !url.pathname.startsWith('/api/login/')) {
    const access = await renewToken()
    if (access) {
      const headers = new Headers(options.headers)
      headers.set('Authorization', `Bearer ${access}`)
      requestOptions = {...options, headers}
      response = await globalThis.fetch(input, requestOptions)
    }
  }
  if (!response.ok || (options.method || 'GET').toUpperCase() !== 'GET') return response
  if (!response.headers.get('content-type')?.includes('application/json')) return response
  let page = await response.clone().json()
  if (!page || !Array.isArray(page.results) || !('next' in page)) return response
  const rows = [...page.results]
  const seen = new Set([url.href])
  while (page.next) {
    const next = new URL(page.next, origin)
    if (next.origin !== origin || !next.pathname.startsWith('/api/') || seen.has(next.href)) {
      throw new Error('La API devolvió una página inválida o repetida.')
    }
    seen.add(next.href)
    const result = await globalThis.fetch(next.href, requestOptions)
    if (!result.ok) throw new Error(`No se pudo completar el listado (${result.status}).`)
    page = await result.json()
    if (!Array.isArray(page.results)) throw new Error('Formato de paginación inválido.')
    rows.push(...page.results)
  }
  return new Response(JSON.stringify(rows), {status: response.status, headers: {'Content-Type':'application/json'}})
}

export function errorMessage(error, fallback = 'No se pudo completar la operación.') {
  return error instanceof Error ? error.message : fallback
}
