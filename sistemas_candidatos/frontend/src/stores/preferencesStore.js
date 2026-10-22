let _prefs = null
const _listeners = new Set()

export const preferencesStore = {
  get current() { return _prefs },
  set(prefs) { _prefs = prefs; _listeners.forEach(fn => fn(_prefs)) },
  get silenced() { return _prefs ? _prefs.cuenta_activa === false : false },
  subscribe(fn) { _listeners.add(fn); fn(_prefs); return () => _listeners.delete(fn) },
}
