const API_BASE_URL = 'https://leave-backend-aqdpg8f9bydpa4gr.indiasouthcentral-01.azurewebsites.net/'
const SESSION_KEY = 'daywell-session'
const VALID_ROLES = new Set(['employee', 'manager', 'admin'])

export function getSession() {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    const role = stored?.role?.toLowerCase()
    if (stored?.token && VALID_ROLES.has(role)) {
      return { token: stored.token, role }
    }
    clearSession()
    return null
  } catch {
    return null
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    token: session.token,
    role: session.role,
  }))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

async function request(path, { method = 'GET', body, authenticated = true } = {}) {
  const session = getSession()
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (authenticated && session?.token) headers.Authorization = `Bearer ${session.token}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not connect to the server. Check your connection and try again.')
  }

  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text ? { message: text } : null
  }

  if (response.status === 401 && authenticated) {
    clearSession()
    window.dispatchEvent(new Event('auth:expired'))
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed (${response.status}).`)
  }
  return data
}

export const api = {
  login: (credentials) => request('/api/auth/login', {
    method: 'POST',
    body: credentials,
    authenticated: false,
  }),
  register: (details) => request('/api/auth/register', {
    method: 'POST',
    body: details,
    authenticated: false,
  }),
  applyForLeave: (leave) => request('/api/leaves/apply', {
    method: 'POST',
    body: leave,
  }),
  getMyLeaves: () => request('/api/leaves/my'),
  getPendingLeaves: () => request('/api/leaves/pending'),
  decideLeave: (id, decision) => {
    if (!['approve', 'reject'].includes(decision)) {
      throw new Error('Unsupported leave decision.')
    }
    return request(`/api/leaves/${decision}/${encodeURIComponent(id)}`, { method: 'PUT' })
  },
  getReport: () => request('/api/admin/report'),
}
