import { apiFetch } from '../../api/http.js'
import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react'
import '../../shared.css'
import './AdminDashboard.css'
import '../estudiante/EstudianteModule.css'
import { API_BASE } from '../../config'
import { preferencesStore } from '../../stores/preferencesStore'

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

const FIELDS = [
  { key: 'notif_mensaje', label: 'Mensajes del chat' },
  { key: 'notif_comunicado', label: 'Comunicados institucionales' },
  { key: 'notif_evento', label: 'Eventos del calendario' },
  { key: 'notif_asistencia', label: 'Notificaciones de asistencia' },
  { key: 'notif_notas', label: 'Notificaciones de calificaciones' },
  { key: 'notif_alumno', label: 'Nuevos alumnos' },
  { key: 'notif_preceptor', label: 'Nuevos preceptores' },
]

const DEFAULT = {}
FIELDS.forEach(f => DEFAULT[f.key] = true)
DEFAULT.cuenta_activa = true

export default function AdminConfiguracion() {
  const [prefs, setPrefs] = useState(null)
  const token = getToken()

  const load = useCallback(() => {
    if (!token) return
    apiFetch(`${API_BASE}/notificaciones/preferencias/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { const m = { ...DEFAULT, ...data }; setPrefs(m); preferencesStore.set(m) }
      })
      .catch(() => {})
  }, [token])

  useEffect(() => { load() }, [load])

  const toggle = (name) => {
    if (!token || !prefs) return
    const next = { ...prefs, [name]: !prefs[name] }
    setPrefs(next)
    preferencesStore.set(next)
    apiFetch(`${API_BASE}/notificaciones/preferencias/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(next),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { const m = { ...DEFAULT, ...data }; setPrefs(m); preferencesStore.set(m) } })
      .catch(() => load())
  }

  const marca = prefs ? prefs.cuenta_activa : null
  const cuentaActiva = marca === true
  const cuentaDesactivada = marca === false

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Preferencias de Notificación</h2>
          <p className="sh-hero-subtitle">Configuración guardada automáticamente en el servidor</p>
        </div>
      </div>

      {!prefs ? (
        <div className="sh-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando...
        </div>
      ) : (
        <div className="sh-card">
          <h3 className="sh-card-title">
            <Bell size={18} style={{ color: 'var(--accent-blue)' }} />
            Notificaciones
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--gray-100)' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Cuenta activa</span>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Desactivar detiene TODAS las notificaciones</p>
              </div>
              <SwitchButton active={cuentaActiva} onClick={() => toggle('cuenta_activa')} />
            </div>
            {FIELDS.map(f => (
              <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{f.label}</span>
                <SwitchButton active={prefs[f.key]} onClick={() => toggle(f.key)} disabled={cuentaDesactivada} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SwitchButton({ active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 48, height: 26, borderRadius: 13, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? '#059669' : (disabled ? '#e5e7eb' : '#d1d5db'),
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s', left: active ? 26 : 2,
      }} />
    </button>
  )
}
