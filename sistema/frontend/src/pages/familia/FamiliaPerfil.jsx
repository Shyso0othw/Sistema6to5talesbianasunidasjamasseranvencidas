import { apiFetch } from '../../api/http.js'
import { useState, useEffect, useRef } from 'react'
import { Bell, BellOff, AlertTriangle, Info, MessageSquare, HeartPulse, CheckCircle2, XCircle, Save, ChevronDown, ChevronUp, User, MapPin, Phone, GraduationCap, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { parseAddress, formatPhone, unformatPhone } from '../../utils/formatters'
import '../estudiante/EstudianteModule.css'
import { API_BASE } from '../../config'
import { preferencesStore } from '../../stores/preferencesStore'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

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
  departamento: 'Departamento'
}

function DireccionDisplay({ direccion }) {
  const addr = parseAddress(direccion)
  if (!addr) {
    return <span className="en-perfil-field-value">{direccion || '-'}</span>
  }
  const parts = [addr.calle, addr.numero ? `N° ${addr.numero}` : ''].filter(Boolean).join(' ')
  const extra = []
  if (addr.entreCalles) extra.push(`Entre: ${addr.entreCalles}`)
  if (addr.tipoVivienda) {
    const label = TIPO_VIVIENDA_LABELS[addr.tipoVivienda] || addr.tipoVivienda
    const extras = []
    if (addr.piso) extras.push(`Piso ${addr.piso}`)
    if (addr.depto) extras.push(`Depto ${addr.depto}`)
    extra.push(`${label}${extras.length ? ' (' + extras.join(', ') + ')' : ''}`)
  }
  if (addr.cp) extra.push(`CP: ${addr.cp}`)
  if (addr.municipalidad) extra.push(addr.municipalidad)
  return (
    <span className="en-perfil-field-value">
      {parts}{extra.length ? <><br /><span style={{ fontSize: 13, color: '#666' }}>{extra.join(' — ')}</span></> : null}
    </span>
  )
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

const RELACION_LABEL_MAP = {
  'Madre': 'Madre',
  'Padre': 'Padre',
  'Tutor/a': 'Tutor',
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

export default function FamiliaPerfil({ estudiante }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSalud, setShowSalud] = useState(false)
  const saludRef = useRef(null)
  const initRef = useRef(false)
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

  const [saludForm, setSaludForm] = useState({
    obra_social: '', numero_afiliado: '', grupo_sanguineo: '', factor_rh: '',
    alergias: '', medicacion: '', enfermedades_preexistentes: '',
    contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
    observaciones_salud: ''
  })
  const [saludSaved, setSaludSaved] = useState(false)
  const [saludError, setSaludError] = useState('')
  const [saludSaving, setSaludSaving] = useState(false)

  useEffect(() => {
    const token = getToken()

    apiFetch(`${API_BASE}/perfil/`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
      .then(r => { if (!r.ok) throw new Error('Error al cargar perfil'); return r.json() })
      .then(d => {
        setData(d)
        setLoading(false)

        const alumnos = d?.perfil_especifico?.alumnos || []
        if (alumnos.length > 0 && !initRef.current) {
          initRef.current = true
          const a = alumnos[0]
          setSaludForm({
            obra_social: a.obra_social || '',
            numero_afiliado: a.numero_afiliado || '',
            grupo_sanguineo: a.grupo_sanguineo || '',
            factor_rh: a.factor_rh || '',
            alergias: a.alergias || '',
            medicacion: a.medicacion || '',
            enfermedades_preexistentes: a.enfermedades_preexistentes || '',
            contacto_emergencia_nombre: a.contacto_emergencia_nombre || '',
            contacto_emergencia_telefono: a.contacto_emergencia_telefono || '',
            observaciones_salud: a.observaciones_salud || ''
          })
        }
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (estudiante?._alumno && !initRef.current) {
      initRef.current = true
      const a = estudiante._alumno
      setSaludForm({
        obra_social: a.obra_social || '',
        numero_afiliado: a.numero_afiliado || '',
        grupo_sanguineo: a.grupo_sanguineo || '',
        factor_rh: a.factor_rh || '',
        alergias: a.alergias || '',
        medicacion: a.medicacion || '',
        enfermedades_preexistentes: a.enfermedades_preexistentes || '',
        contacto_emergencia_nombre: a.contacto_emergencia_nombre || '',
        contacto_emergencia_telefono: a.contacto_emergencia_telefono || '',
        observaciones_salud: a.observaciones_salud || ''
      })
    }
  }, [estudiante])

  const handleSaludChange = (e) => {
    const { name, value } = e.target
    setSaludForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSaludSubmit = async (e) => {
    e.preventDefault()
    setSaludSaving(true)
    setSaludError('')
    setSaludSaved(false)

    const token = getToken()
    const alumnoId = estudiante?._alumno?.id || data?.perfil_especifico?.alumnos?.[0]?.id
    if (!alumnoId) {
      setSaludError('No se encontró el estudiante.')
      setSaludSaving(false)
      return
    }

    try {
      const response = await apiFetch(`${API_BASE}/alumnos/${alumnoId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...saludForm,
          contacto_emergencia_telefono: unformatPhone(saludForm.contacto_emergencia_telefono)
        }),
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(Object.values(errData).flat().join('. ') || 'Error al guardar')
      }
      setSaludSaved(true)
      setTimeout(() => setSaludSaved(false), 3000)
    } catch (err) {
      setSaludError(err.message)
    } finally {
      setSaludSaving(false)
    }
  }

  const abrirSalud = () => {
    if (showSalud) {
      setShowSalud(false)
    } else {
      setShowSalud(true)
      setTimeout(() => {
        saludRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  if (loading) {
    return (
      <div className="sh-page">
        <div className="sh-hero">
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Perfil Familiar</h2>
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
            <h2 className="sh-hero-title">Perfil Familiar</h2>
            <p className="sh-hero-subtitle">No se pudo cargar el perfil</p>
          </div>
        </div>
        <div className="sh-card" style={{ padding: 24, textAlign: 'center', color: '#c33' }}>{error}</div>
      </div>
    )
  }

  const perfil = data?.perfil_especifico || {}
  const nombreCompleto = `${perfil.nombre || ''} ${perfil.apellido || ''}`.trim() || data?.nombre_completo || 'Sin nombre'
  const pAlumnos = data?.perfil_especifico?.alumnos || []
  const p = estudiante?._alumno || pAlumnos[0] || {}
  const estudianteNombre = p.nombre ? `${p.nombre} ${p.apellido}` : (estudiante?.nombre || 'No especificado')
  const estudianteCurso = p.año && p.division ? `${p.año}° "${p.division}"` : (estudiante?.curso || '-')

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Perfil Familiar</h2>
          <p className="sh-hero-subtitle">Información del tutor y del estudiante a cargo</p>
        </div>
      </div>

      <div className="sh-card">
        <div className="en-perfil-avatar-section">
          <div className="en-perfil-avatar" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            {nombreCompleto.charAt(0)}
          </div>
          <div>
            <h3 className="en-perfil-name">{nombreCompleto}</h3>
            <p className="en-perfil-curso">Tutor responsable</p>
          </div>
        </div>
      </div>

      <div className="en-perfil-grid" style={{ marginTop: 24 }}>
        <div className="sh-card">
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} /> Datos del Tutor
          </h4>
          <div className="en-perfil-info-grid">
            <Field label="DNI" value={formatDNIDisplay(perfil.dni)} />
            <Field label="Fecha de Nacimiento" value={formatearFecha(perfil.fecha_nacimiento)} />
            <Field label="Lugar de Nacimiento" value={perfil.lugar_nacimiento} />
            <Field label="Nacionalidad" value={perfil.nacionalidad} />
            <Field label="Sexo" value={perfil.sexo} />
            <Field label="Identidad de Género" value={perfil.identidad_genero} />
            <Field label="Relación" value={perfil.relacion} />
            <Field label="Usuario" value={data?.username} />
          </div>
        </div>

        <div className="sh-card">
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={16} /> Estudiante a cargo
          </h4>
          <div className="en-perfil-info-grid">
            <Field label="Nombre" value={estudianteNombre} />
            <Field label="Curso" value={estudianteCurso} />
            <Field label="DNI" value={formatDNIDisplay(p.dni)} />
            <Field label="Fecha de Nacimiento" value={formatearFecha(p.fecha_nacimiento)} />
            <Field label="Lugar de Nacimiento" value={p.lugar_nacimiento} />
            <Field label="Nacionalidad" value={p.nacionalidad} />
            <Field label="Sexo" value={p.sexo} />
            <Field label="Identidad de Género" value={p.identidad_genero} />
          </div>
        </div>
      </div>

      <div className="sh-card" style={{ marginTop: 24 }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={16} /> Dirección
        </h4>
        <div className="en-perfil-info-grid">
          {perfil.direccion ? (
            <div className="en-perfil-field" style={{ gridColumn: '1 / -1' }}>
              <span className="en-perfil-field-label">Dirección (Tutor)</span>
              <DireccionDisplay direccion={perfil.direccion} />
            </div>
          ) : null}
          <Field label="Localidad" value={perfil.localidad} />
          <Field label="Partido" value={perfil.partido} />
          {p.direccion ? (
            <div className="en-perfil-field" style={{ gridColumn: '1 / -1' }}>
              <span className="en-perfil-field-label">Dirección (Estudiante)</span>
              <DireccionDisplay direccion={p.direccion} />
            </div>
          ) : null}
          <Field label="Partido (Est.)" value={p.partido} />
        </div>
      </div>

      <div className="sh-card" style={{ marginTop: 24 }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Phone size={16} /> Contacto
        </h4>
        <div className="en-perfil-info-grid">
          {perfil.telefono ? (
            <Field label="Tel. del Tutor" value={formatPhoneDisplay(perfil.telefono)} />
          ) : null}
          {perfil.email ? (
            <Field label="Email" value={perfil.email} />
          ) : null}
          {p.telefono_padre ? (
            <Field label={`Tel. ${RELACION_LABEL_MAP[perfil.relacion] || 'Tutor'}`} value={formatPhoneDisplay(p.telefono_padre)} />
          ) : null}
          {p.telefono_madre && p.telefono_madre !== p.telefono_padre ? (
            <Field label="Tel. Alternativo" value={formatPhoneDisplay(p.telefono_madre)} />
          ) : null}
          {p.email && !perfil.email ? (
            <Field label="Email (Est.)" value={p.email} />
          ) : null}
        </div>
      </div>

      {p.id && (
        <div className="sh-card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <HeartPulse size={16} /> Ficha de Salud
            </h4>
            <button onClick={abrirSalud} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: showSalud ? '#eef2ff' : '#f0fdf4', color: showSalud ? '#4a63e0' : '#059669',
              border: `2px solid ${showSalud ? '#4a63e0' : '#059669'}`,
              borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}>
              <HeartPulse size={16} />
              {showSalud ? 'Cerrar' : 'Ver Ficha de Salud'}
              {showSalud ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showSalud && (
            <div ref={saludRef} style={{ marginTop: 16, borderTop: '2px solid var(--gray-100)', paddingTop: 16 }}>
              <form onSubmit={handleSaludSubmit}>
                <h5 style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HeartPulse size={14} /> Editando ficha de {p.nombre} {p.apellido}
                </h5>

                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px', fontWeight: 600 }}>Datos de Obra Social</h5>
                  <div className="en-perfil-info-grid">
                    <div className="en-perfil-field">
                      <span className="en-perfil-field-label">Obra Social</span>
                      <input className="tooltip agregar-alumno-input" type="text" name="obra_social" value={saludForm.obra_social} onChange={handleSaludChange} placeholder="Obra social" style={{ marginTop: 4 }} />
                    </div>
                    <div className="en-perfil-field">
                      <span className="en-perfil-field-label">N° de Afiliado</span>
                      <input className="tooltip agregar-alumno-input" type="text" name="numero_afiliado" value={saludForm.numero_afiliado} onChange={handleSaludChange} placeholder="Número de afiliado" style={{ marginTop: 4 }} />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px', fontWeight: 600 }}>Datos de Sangre</h5>
                  <div className="en-perfil-info-grid">
                    <div className="en-perfil-field">
                      <span className="en-perfil-field-label">Grupo Sanguíneo</span>
                      <select className="tooltip agregar-alumno-select" name="grupo_sanguineo" value={saludForm.grupo_sanguineo} onChange={handleSaludChange} style={{ marginTop: 4 }}>
                        <option value="">Seleccione...</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                        <option value="O">O</option>
                      </select>
                    </div>
                    <div className="en-perfil-field">
                      <span className="en-perfil-field-label">Factor RH</span>
                      <select className="tooltip agregar-alumno-select" name="factor_rh" value={saludForm.factor_rh} onChange={handleSaludChange} style={{ marginTop: 4 }}>
                        <option value="">Seleccione...</option>
                        <option value="+">+</option>
                        <option value="-">-</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px', fontWeight: 600 }}>Alergias y Medicación</h5>
                  <div className="en-perfil-info-grid">
                    <div className="en-perfil-field" style={{ gridColumn: '1 / -1' }}>
                      <span className="en-perfil-field-label">Alergias</span>
                      <textarea className="tooltip agregar-alumno-textarea" name="alergias" value={saludForm.alergias} onChange={handleSaludChange} placeholder="Alergias..." rows={2} style={{ marginTop: 4 }} />
                    </div>
                    <div className="en-perfil-field" style={{ gridColumn: '1 / -1' }}>
                      <span className="en-perfil-field-label">Medicación</span>
                      <textarea className="tooltip agregar-alumno-textarea" name="medicacion" value={saludForm.medicacion} onChange={handleSaludChange} placeholder="Medicación..." rows={2} style={{ marginTop: 4 }} />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px', fontWeight: 600 }}>Enfermedades Preexistentes</h5>
                  <textarea className="tooltip agregar-alumno-textarea" name="enfermedades_preexistentes" value={saludForm.enfermedades_preexistentes} onChange={handleSaludChange} placeholder="Enfermedades preexistentes..." rows={2} style={{ marginTop: 4 }} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px', fontWeight: 600 }}>Contacto de Emergencia</h5>
                  <div className="en-perfil-info-grid">
                    <div className="en-perfil-field">
                      <span className="en-perfil-field-label">Nombre</span>
                      <input className="tooltip agregar-alumno-input" type="text" name="contacto_emergencia_nombre" value={saludForm.contacto_emergencia_nombre} onChange={handleSaludChange} placeholder="Nombre del contacto" style={{ marginTop: 4 }} />
                    </div>
                    <div className="en-perfil-field">
                      <span className="en-perfil-field-label">Teléfono</span>
                      <input maxLength={53} className="tooltip agregar-alumno-input" type="tel" name="contacto_emergencia_telefono" value={saludForm.contacto_emergencia_telefono} onChange={(e) => setSaludForm(prev => ({ ...prev, contacto_emergencia_telefono: formatPhone(e.target.value) }))} placeholder="+54 9 11 XXXX-XXXX" style={{ marginTop: 4 }} />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px', fontWeight: 600 }}>Observaciones de Salud</h5>
                  <textarea className="tooltip agregar-alumno-textarea" name="observaciones_salud" value={saludForm.observaciones_salud} onChange={handleSaludChange} placeholder="Observaciones de salud..." rows={3} style={{ marginTop: 4 }} />
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button type="submit" className="tooltip agregar-alumno-btn agregar-alumno-btn-primary" disabled={saludSaving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Save size={16} /> {saludSaving ? 'Guardando...' : 'Guardar Ficha de Salud'}
                  </button>
                  {saludSaved && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: 14, fontWeight: 600 }}>
                      <CheckCircle2 size={18} /> Ficha de salud guardada
                    </span>
                  )}
                  {saludError && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: 14 }}>
                      <XCircle size={18} /> {saludError}
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {perfil.observaciones ? (
        <div className="sh-card" style={{ marginTop: 24 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} /> Observaciones
          </h4>
          <p style={{ fontSize: 14, color: 'var(--text-main)', margin: 0 }}>{perfil.observaciones}</p>
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
