import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { Bell, BellOff, AlertTriangle, Info, MessageSquare, HeartPulse, Phone, MapPin, User, GraduationCap, CheckCircle2, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import './EstudianteModule.css'
import { API_BASE } from '../../config'
import { preferencesStore } from '../../stores/preferencesStore'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '-'
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const mes = hoy.getMonth() - nac.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return '-'
  const d = new Date(fechaISO)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDNIDisplay(dni) {
  if (!dni || dni.length !== 8 || /\D/.test(dni)) return dni || '-'
  return dni.slice(0, 2) + '.' + dni.slice(2, 5) + '.' + dni.slice(5)
}

function formatPhoneDisplay(telefono) {
  if (!telefono) return '-'
  const d = telefono.replace(/\D/g, '')
  if (d.length >= 10) {
    const last8 = d.slice(-8)
    return '+54 9 11 ' + last8.slice(0, 4) + '-' + last8.slice(4)
  }
  return telefono
}

const TIPO_VIVIENDA_LABELS = {
  casa: 'Casa',
  edificio: 'Edificio',
  departamento: 'Departamento',
  ph: 'PH',
  otro: 'Otro'
}

function Field({ label, value }) {
  if (!value || value === '-' || value === '') return null
  return (
    <div className="en-perfil-field">
      <span className="en-perfil-field-label">{label}</span>
      <span className="en-perfil-field-value">{value}</span>
    </div>
  )
}

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Completá todos los campos')
      return
    }
    if (newPassword.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    setSubmitting(true)
    try {
      const r = await apiFetch(`${API_BASE}/cambiar-contrasena/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error al cambiar la contraseña')
      setSuccess('Contraseña cambiada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0e0e0',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}><AlertCircle size={16} />{error}</div>}
      {success && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', color: '#16a34a', borderRadius: 8, fontSize: 13 }}><CheckCircle2 size={16} />{success}</div>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Contraseña actual</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Nueva contraseña</label>
          <input type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mín. 4 caracteres" style={{ ...inputStyle, paddingRight: 40 }} />
          <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: 32, background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0, display: 'flex' }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Confirmar nueva</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repetí la contraseña" style={inputStyle} />
        </div>
      </div>
      <div>
        <button type="submit" disabled={submitting} style={{
          padding: '10px 24px', borderRadius: 8, border: 'none', background: '#4a63e0', color: '#fff',
          fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
          opacity: submitting ? 0.7 : 1,
        }}>
          <Lock size={16} /> {submitting ? 'Cambiando...' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  )
}

export default function EstudiantePerfil({
  curso
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const KEY_MAP = { asistencia: 'notif_asistencia', notas: 'notif_notas', comunicados: 'notif_comunicado', eventos: 'notif_evento', mensajes: 'notif_mensaje' }
  const [notifPrefs, setNotifPrefs] = useState(null)

  const loadNotifPrefs = () => {
    const token = getToken()
    if (!token) return
    apiFetch(`${API_BASE}/notificaciones/preferencias/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setNotifPrefs(data); preferencesStore.set(data) }
      })
      .catch(() => {})
  }

  useEffect(() => { loadNotifPrefs() }, [])

  const toggleNotif = (name) => {
    const token = getToken()
    if (!token || !notifPrefs) return
    const next = { ...notifPrefs, [name]: !notifPrefs[name] }
    setNotifPrefs(next)
    preferencesStore.set(next)
    apiFetch(`${API_BASE}/notificaciones/preferencias/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(next),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setNotifPrefs(data); preferencesStore.set(data) } })
      .catch(() => loadNotifPrefs())
  }

  const notifSilenced = notifPrefs ? !notifPrefs.cuenta_activa : false
  const getPref = (localKey) => notifPrefs ? notifPrefs[KEY_MAP[localKey]] : false

  useEffect(() => {
    const token = getToken()
    apiFetch(`${API_BASE}/perfil/`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
      .then(r => { if (!r.ok) throw new Error('Error al cargar perfil'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="sh-page">
        <div className="sh-hero">
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Perfil del Estudiante</h2>
            <p className="sh-hero-subtitle">Cargando información...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sh-page">
        <div className="sh-hero">
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Perfil del Estudiante</h2>
            <p className="sh-hero-subtitle">No se pudo cargar el perfil</p>
          </div>
        </div>
        <div className="sh-card" style={{ padding: 24, textAlign: 'center', color: '#c33' }}>{error}</div>
      </div>
    )
  }

  const p = data?.perfil_especifico || {}
  const nombreCompleto = `${p.nombre || ''} ${p.apellido || ''}`.trim() || data?.nombre_completo || 'Sin nombre'
  const cursoMostrar = p.año && p.division ? `${p.año}° "${p.division}"` : (curso || '-')

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Perfil del Estudiante</h2>
          <p className="sh-hero-subtitle">Información personal, académica y de salud</p>
        </div>
      </div>

      <div className="sh-card">
        <div className="en-perfil-avatar-section">
          <div
            className="en-perfil-avatar"
            style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
          >
            {nombreCompleto.charAt(0)}
          </div>
          <div>
            <h3 className="en-perfil-name">{nombreCompleto}</h3>
            <p className="en-perfil-curso">{cursoMostrar}</p>
          </div>
        </div>
      </div>

      <div className="en-perfil-grid" style={{ marginTop: 24 }}>
        <div className="sh-card">
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} /> Datos Personales
          </h4>
          <div className="en-perfil-info-grid">
            <Field label="DNI" value={formatDNIDisplay(p.dni)} />
            <Field label="CUIL" value={p.cuil} />
            <Field label="Fecha de Nacimiento" value={formatearFecha(p.fecha_nacimiento)} />
            <Field label="Edad" value={p.fecha_nacimiento ? `${calcularEdad(p.fecha_nacimiento)} años` : null} />
            <Field label="Lugar de Nacimiento" value={p.lugar_nacimiento} />
            <Field label="Nacionalidad" value={p.nacionalidad} />
            <Field label="Sexo" value={p.sexo} />
            <Field label="Identidad de Género" value={p.identidad_genero} />
          </div>
        </div>

        <div className="sh-card">
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={16} /> Datos Académicos
          </h4>
          <div className="en-perfil-info-grid">
            <Field label="Curso" value={cursoMostrar} />
            <Field label="Grupo" value={p.grupo ? `Grupo ${p.grupo}` : null} />
            <Field label="Email" value={p.email} />
            <Field label="Usuario" value={data?.username} />
          </div>
        </div>
      </div>

      <div className="sh-card" style={{ marginTop: 24 }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={16} /> Dirección
        </h4>
        <div className="en-perfil-info-grid">
          <Field label="Calle" value={[p.calle, p.numero_calle ? `N° ${p.numero_calle}` : ''].filter(Boolean).join(' ')} />
          <Field label="Entre calles" value={p.entre_calles} />
          <Field label="Tipo de Vivienda" value={TIPO_VIVIENDA_LABELS[(p.tipo_vivienda || '').toLowerCase()] || p.tipo_vivienda} />
          <Field label="Piso" value={p.piso} />
          <Field label="Letra" value={p.letra_edificio || p.letra_ph} />
          <Field label="Localidad" value={p.localidad} />
          <Field label="Municipio" value={p.municipio} />
          <Field label="Partido" value={p.partido} />
        </div>
      </div>

      {p.telefonos_tutores && p.telefonos_tutores.length > 0 ? (
        <div className="sh-card" style={{ marginTop: 24 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone size={16} /> Teléfonos de Tutores
          </h4>
          <div className="en-perfil-info-grid">
            {p.telefonos_tutores.map((t, i) => (
              <Field key={i} label={t.titulo || `Teléfono ${i + 1}`} value={formatPhoneDisplay(t.numero)} />
            ))}
          </div>
        </div>
      ) : null}

      {p.familias && p.familias.length > 0 ? (
        <div className="sh-card" style={{ marginTop: 24 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} /> Tutor a cargo
          </h4>
          <div className="en-perfil-info-grid">
            <Field label="Nombre" value={`${p.familias[0].nombre} ${p.familias[0].apellido}`} />
            <Field label="DNI" value={formatDNIDisplay(p.familias[0].dni)} />
            <Field label="Teléfono" value={formatPhoneDisplay(p.familias[0].telefono)} />
            <Field label="Email" value={p.familias[0].email} />
          </div>
        </div>
      ) : null}

      <div className="sh-card" style={{ marginTop: 24 }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeartPulse size={16} /> Ficha de Salud
        </h4>
        <div className="en-perfil-info-grid">
          <Field label="Obra Social" value={p.obra_social} />
          <Field label="N° de Afiliado" value={p.numero_afiliado} />
          <Field label="Grupo Sanguíneo" value={p.grupo_sanguineo} />
          <Field label="Factor RH" value={p.factor_rh ? `RH ${p.factor_rh}` : null} />
          <Field label="Alergias" value={p.alergias} />
          <Field label="Medicación" value={p.medicacion} />
          <Field label="Enfermedades Preexistentes" value={p.enfermedades_preexistentes} />
          <Field label="Contacto de Emergencia" value={p.contacto_emergencia_nombre} />
          <Field label="Tel. Emergencia" value={formatPhoneDisplay(p.contacto_emergencia_telefono)} />
          <Field label="Observaciones de Salud" value={p.observaciones_salud} />
        </div>
      </div>

      {p.observaciones ? (
        <div className="sh-card" style={{ marginTop: 24 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} /> Observaciones
          </h4>
          <p style={{ fontSize: 14, color: 'var(--text-main)', margin: 0 }}>{p.observaciones}</p>
        </div>
      ) : null}

      <div className="sh-card" style={{ marginTop: 24 }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BellOff size={16} /> Preferencias de Notificaciones
        </h4>
        {!notifPrefs ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

            {[
              { key: 'asistencia', label: 'Asistencia', icon: AlertTriangle, desc: 'Alertas por inasistencias' },
              { key: 'notas', label: 'Calificaciones', icon: Info, desc: 'Nuevas notas cargadas' },
              { key: 'comunicados', label: 'Comunicados', icon: MessageSquare, desc: 'Comunicados institucionales' },
              { key: 'eventos', label: 'Eventos', icon: Bell, desc: 'Recordatorios de eventos' },
              { key: 'mensajes', label: 'Mensajes', icon: MessageSquare, desc: 'Notificaciones de chat' },
            ].map(({ key, label, icon: Icon, desc }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--gray-100)', opacity: notifSilenced ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={16} style={{ color: getPref(key) && !notifSilenced ? '#4a63e0' : '#ccc' }} />
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', textDecoration: notifSilenced ? 'line-through' : 'none' }}>{label}</span>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1, textDecoration: notifSilenced ? 'line-through' : 'none' }}>{desc}</p>
                  </div>
                </div>
                <button onClick={() => toggleNotif(KEY_MAP[key])} disabled={notifSilenced} style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: notifSilenced ? 'not-allowed' : 'pointer',
                  background: notifSilenced ? '#d1d5db' : (getPref(key) ? '#059669' : '#d1d5db'), position: 'relative', transition: 'background 0.2s', flexShrink: 0
                }}>
                  <span style={{
                    position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
                    left: getPref(key) && !notifSilenced ? 22 : 2
                  }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sh-card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={16} /> Cambiar Contraseña
            </h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Actualizá tu contraseña de acceso al sistema</p>
          </div>
        </div>
        <PasswordChangeForm />
      </div>

    </div>
  )
}
