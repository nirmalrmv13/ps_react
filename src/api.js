import { loadSession } from './session.js'

const API_URL = import.meta.env.VITE_API_URL

let unauthorizedHandler = null

export function onUnauthorized(handler) {
  unauthorizedHandler = handler
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null
  }
}

async function request(path, { headers, ...options } = {}) {
  const token = loadSession()?.token
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...(token && { Authorization: `Bearer ${token}` }), ...headers },
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new Error('Cannot reach the server. Please make sure the backend is running.', {
      cause: err,
    })
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token) unauthorizedHandler?.(data.message)
    throw new Error(data.message || `Request failed (${res.status}).`)
  }
  return data
}

function sendJson(method, path, body, options) {
  return request(path, {
    ...options,
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function apiGet(path, options) {
  return request(path, options)
}

export function apiPost(path, body, options) {
  return sendJson('POST', path, body, options)
}

export function apiPut(path, body, options) {
  return sendJson('PUT', path, body, options)
}
