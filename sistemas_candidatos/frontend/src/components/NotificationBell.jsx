import { apiFetch } from '../api/http.js'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Info, Calendar, Mail, MessageSquare, UserPlus, UserCheck, UserCog, ClipboardCheck, BookOpen, Users } from 'lucide-react'
import { notificationStore } from '../stores/notificationStore'
import { preferencesStore } from '../stores/preferencesStore'
import { eventBus } from '../stores/eventBus'
import { API_BASE } from '../config'

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

function getNotificationIcon(tipo) {
  switch(tipo) {
    case 'evento': return <Calendar size={18} />;
    case 'comunicado': return <Mail size={18} />;
    case 'mensaje': return <MessageSquare size={18} />;
    case 'alumno': return <UserPlus size={18} />;
    case 'preceptor': return <UserCog size={18} />;
    case 'docente': return <UserCheck size={18} />;
    case 'asistencia': return <ClipboardCheck size={18} />;
    case 'notas': return <BookOpen size={18} />;
    case 'familia': return <Users size={18} />;
    default: return <Info size={18} />;
  }
}

function formatRelativeTime(dateString) {
  if (!dateString) return ''
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `Hace ${diffHrs}h`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 30) return `Hace ${diffDays}d`
  return date.toLocaleDateString('es-AR')
}

let _audioCtx = null

function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume()
  }
  return _audioCtx
}

function playNotificationSound() {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch { return false }
}

// Reanudar AudioContext cuando la página pasa a primer plano (necesario en móviles)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && _audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume()
  }
})

function sendBrowserNotification(titulo, cuerpo, tipo) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    const n = new Notification(titulo, {
      body: cuerpo,
      tag: `notif-${tipo}`,
      silent: true,
    })
    n.onclick = () => window.focus()
    setTimeout(() => n.close(), 5000)
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission()
  }
}



const NOTIF_SECTION_MAP = {
  evento: 'calendario',
  comunicado: 'comunicados',
  mensaje: 'chat',
  alumno: 'agregar-alumno',
  preceptor: 'agregar-preceptor',
  docente: 'agregar-docente',
  asistencia: 'asistencia-personal',
  notas: 'notas',
  familia: 'tutores-familias',
}

export default function NotificationBell({ onNavigate }) {
  const [notifications, setNotifications] = useState(() => [...notificationStore.notifications])
  const [isOpen, setIsOpen] = useState(false)
  const [silenced, setSilenced] = useState(preferencesStore.silenced)
  const ref = useRef(null)
  const prevCountRef = useRef(0)

  useEffect(() => {
    const unsubNotis = notificationStore.subscribe((list) => {
      setNotifications([...list])
    })
    const unsubPrefs = preferencesStore.subscribe((p) => {
      setSilenced(p ? p.cuenta_activa === false : false)
    })
    // Escuchar evento WebSocket de notificación leída para remover de la UI
    const unsubRead = eventBus.on('notification_read', ({ notification_id }) => {
      setNotifications(prev => prev.filter(n => n.id !== notification_id))
      notificationStore.removeNotification(notification_id)
    })
    return () => { unsubNotis(); unsubPrefs(); unsubRead() }
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    const currentUnread = notificationStore.unreadCount
    if (currentUnread > prevCountRef.current) {
      const newest = notificationStore.notifications.find(n => !n.leido)
      if (newest && !newest.silent) {
        playNotificationSound()
        sendBrowserNotification(
          newest.titulo || 'Nueva notificación',
          newest.cuerpo || '',
          newest.tipo
        )
      }
    }
    prevCountRef.current = currentUnread
  }, [notifications])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    let active = true

    const fetchNotis = () => {
      apiFetch(`${API_BASE}/notificaciones/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (active) {
            data.forEach(n => notificationStore.addNotification(n))
          }
        })
        .catch(() => {})
    }

    fetchNotis()
    const interval = setInterval(fetchNotis, 30000)

    return () => { active = false; clearInterval(interval) }
  }, [])

  const [operationError, setOperationError] = useState('')
  const handleNotificationClick = useCallback(async (n) => {
    setOperationError('')
    const token = getToken()
    if (!n.leido && token) {
      try {
        const response=await apiFetch(`${API_BASE}/notificaciones/${n.id}/leer/`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
        if(!response.ok) throw new Error('No se pudo marcar la notificación como leída.');
      } catch(error) {setOperationError(error.message);return;}
      notificationStore.markAsRead(n.id)
    }
    setIsOpen(false)
    const section = NOTIF_SECTION_MAP[n.tipo] || null
    eventBus.emit('notification-navigate', { section, notification: n })
    if (onNavigate) {
      onNavigate(section, n)
    }
  }, [onNavigate])

  const unreadCount = notifications.filter(n => !n.leido).length

  return (
    <div className="sh-notifications-widget" ref={ref}>
      <button
        className="sh-desktop-topbar-notif"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Notificaciones"
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={20} />
          {silenced && <div style={{ position: 'absolute', width: '120%', height: 2, background: 'var(--text-muted)', transform: 'rotate(-45deg)', borderRadius: 1 }} />}
        </div>
        {unreadCount > 0 && (
          <span className="sh-notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
      {isOpen && (
        <div className="sh-notifications-dropdown">
          <div className="sh-notifications-header">
            <h4>Notificaciones</h4>
            {unreadCount > 0 && (
              <button className="sh-notifications-clear" onClick={async () => {
                const token = getToken()
                try {
                  const response=await apiFetch(`${API_BASE}/notificaciones/leer-todas/`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
                  if(!response.ok)throw new Error('No se pudieron marcar las notificaciones.');
                  notificationStore.markAllAsRead();setOperationError('');
                }catch(error){setOperationError(error.message)}
              }}>
                Marcar todas leídas
              </button>
            )}
          </div>
          {operationError && <p role="alert">{operationError}</p>}<div className="sh-notifications-list">
            {notifications.length === 0 ? (
              <div className="sh-notifications-empty">No hay notificaciones</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`sh-notification-item ${!n.leido ? 'sh-notification-item--unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className={`sh-notification-icon-wrap sh-notification-icon-wrap--${n.tipo || 'info'}`}>
                    {getNotificationIcon(n.tipo || 'info')}
                  </div>
                  <div className="sh-notification-content">
                    <p className="sh-notification-text">{n.cuerpo || n.titulo}</p>
                    <span className="sh-notification-time">{formatRelativeTime(n.fecha_creacion)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div style={{ padding: '8px 20px', borderTop: '1px solid var(--gray-100)' }}>
              <button
                className="sh-notifications-clear"
                onClick={async () => {
                  const token = getToken()
                  try {
                    const response=await apiFetch(`${API_BASE}/notificaciones/limpiar/`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                    if(!response.ok)throw new Error('No se pudieron limpiar las notificaciones.');
                    notificationStore.clearAll();setOperationError('');
                  }catch(error){setOperationError(error.message)}
                }}
                style={{ width: '100%', textAlign: 'center', padding: '8px' }}
              >
                Limpiar leídas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
