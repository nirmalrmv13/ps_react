const SESSION_KEY = 'serene-session'

export function loadSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    return session?.token && session?.user ? session : null
  } catch {
    return null
  }
}

export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}
