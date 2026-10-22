const _handlers = {}

export const eventBus = {
  on(event, fn) {
    if (!_handlers[event]) _handlers[event] = new Set()
    _handlers[event].add(fn)
    return () => _handlers[event].delete(fn)
  },
  emit(event, data) {
    if (_handlers[event]) _handlers[event].forEach(fn => fn(data))
  },
}
