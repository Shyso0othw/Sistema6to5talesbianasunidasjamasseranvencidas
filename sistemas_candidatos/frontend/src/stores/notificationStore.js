let _notifications = []
const _listeners = new Set()

function notify() {
  _listeners.forEach(fn => fn(_notifications))
}

export const notificationStore = {
  get notifications() {
    return _notifications
  },
  get unreadCount() {
    return _notifications.filter(n => !n.leido).length
  },

  setNotifications(list) {
    _notifications = list
    notify()
  },

  addNotification(notif) {
    if (_notifications.some(n => n.id === notif.id)) return
    _notifications = [notif, ..._notifications]
    notify()
  },

  markAsRead(id) {
    _notifications = _notifications.map(n =>
      n.id === id ? { ...n, leido: true } : n
    )
    notify()
  },

  markAllAsRead() {
    _notifications = _notifications.map(n => ({ ...n, leido: true }))
    notify()
  },

  clearAll() {
    _notifications = _notifications.filter(n => !n.leido)
    notify()
  },

  removeNotification(id) {
    _notifications = _notifications.filter(n => n.id !== id)
    notify()
  },

  reset() {
    _notifications = []
    notify()
  },

  subscribe(fn) {
    _listeners.add(fn)
    return () => _listeners.delete(fn)
  },
}
