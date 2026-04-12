/**
 * Simple global state — survives page navigation within the same session.
 * React context-free, just a shared JS object + listener pattern.
 */

const state = {
  uploadResult: null,   // full response from /api/analyze/upload
  fileName: null,
}

const listeners = new Set()

export function getDatasetState() {
  return state
}

export function setDatasetState(partial) {
  Object.assign(state, partial)
  listeners.forEach(fn => fn({ ...state }))
}

export function subscribeDatasetStore(setter) {
  // Call this inside a useEffect to subscribe
  listeners.add(setter)
  return () => listeners.delete(setter)
}
