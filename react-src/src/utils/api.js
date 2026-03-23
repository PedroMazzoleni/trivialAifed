const SERVER = window.location.origin

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${SERVER}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const apiGet  = (path)       => apiFetch(path)
export const apiPost = (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
