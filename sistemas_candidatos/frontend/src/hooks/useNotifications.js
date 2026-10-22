import { apiFetch } from '../api/http.js'
import { useCallback } from 'react'
import { useWebSocket } from './useWebSocket'
import { API_BASE } from '../config'
import { notificationStore } from '../stores/notificationStore'

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

export function useNotifications(options = {}) {
  const { onEventoUpdate, onNewComunicado, onNewAlumno, onNewPreceptor, onNewDocente, onNewFamilia, onAsistenciaUpdated, onNotification, ...rest } = options

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'evento_update':
        onEventoUpdate?.(data)
        break
      case 'new_comunicado':
        onNewComunicado?.(data)
        break
      case 'new_alumno':
        onNewAlumno?.(data)
        break
      case 'new_preceptor':
        onNewPreceptor?.(data)
        break
      case 'new_docente':
        onNewDocente?.(data)
        break
      case 'new_familia':
        onNewFamilia?.(data)
        break
      case 'asistencia_updated':
        onAsistenciaUpdated?.(data)
        break
      case 'notification':
        onNotification?.(data)
        break
      case 'pending_notifications':
        if (data.notifications) {
          data.notifications.forEach(n => notificationStore.addNotification(n))
        }
        break
    }
  }, [onEventoUpdate, onNewComunicado, onNewAlumno, onNewPreceptor, onNewDocente, onNewFamilia, onAsistenciaUpdated, onNotification])

  const handleOpen = useCallback(() => {
    const token = getToken()
    if (!token) return
    apiFetch(`${API_BASE}/notificaciones/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          notificationStore.setNotifications(data)
        }
      })
      .catch(() => {})
  }, [])

  return useWebSocket('/notifications/', { onMessage: handleMessage, onOpen: handleOpen, ...rest })
}
