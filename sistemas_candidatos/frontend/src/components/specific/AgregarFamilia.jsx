import { apiFetch } from '../../api/http.js'
import { useState, useEffect, useRef } from 'react'
import {
  UserPlus, Phone,
  Calendar, CheckCircle2, XCircle, Plus, Trash2, MapPin, Search, GraduationCap, User
} from 'lucide-react'
import '../../shared.css'
import '../../components/specific/AgregarAlumno.css'
import {
  capitalizeWords, stripNonAlpha, formatDNI, unformatDNI, isValidDNI,
  formatPhone, unformatPhone, formatCP, isValidCP, buildAddress, isNumericKey
} from '../../utils/formatters'

import { API_BASE } from '../../config'

function AlumnoSearchPopup({ onSelect, selected, onRemove }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const ref = useRef(null)
  const controllerRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = async (q) => {
    setQuery(q)
    setFetchError('')

    if (selected) return

    if (q.trim().length < 1) {
      setOpen(true)
      setResults([])
      return
    }

    if (controllerRef.current) {
      controllerRef.current.abort()
    }
    const controller = new AbortController()
    controllerRef.current = controller

    setOpen(true)
    setLoading(true)
    try {
      const res = await apiFetch(`${API_BASE}/alumnos/`, {
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
      const all = await res.json()
      if (controller.signal.aborted) return
      const qLower = q.toLowerCase()
      const filtrados = all.filter(a =>
        a.nombre && a.apellido &&
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(qLower)
      ).slice(0, 15)
      setResults(filtrados)
    } catch (err) {
      if (err.name === 'AbortError') return
      setFetchError(`Error al conectar con el servidor: ${err.message}`)
      setResults([])
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }

  const select = (alumno) => {
    onSelect(alumno)
    setQuery(`${alumno.nombre} ${alumno.apellido}`)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label className="agregar-alumno-label">Estudiante a cargo</label>
      <div className="sh-input-group">
        <Search size={18} className="sh-input-icon" />
        <input
          className="sh-input sh-input-with-icon agregar-alumno-input"
          type="text"
          value={selected ? `${selected.nombre} ${selected.apellido}` : query}
          onChange={(e) => { if (!selected) search(e.target.value) }}
          onFocus={() => { if (!selected && open === false && query.length >= 1) search(query) }}
          placeholder="Escriba el nombre o apellido del estudiante..."
          disabled={!!selected}
          autoComplete="off"
          style={{ paddingLeft: 40, marginTop: 4 }}
        />
        {selected && (
          <button type="button" onClick={onRemove} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4
          }}>
            <XCircle size={16} />
          </button>
        )}
      </div>

      {open && loading && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 20, textAlign: 'center',
          color: '#4a63e0', fontSize: 14, marginTop: 4
        }}>
          Buscando estudiantes...
        </div>
      )}

      {open && !loading && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 280, overflow: 'auto', marginTop: 4
        }}>
          {results.map(a => (
            <button key={a.id} type="button" onClick={() => select(a)} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px',
              border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
              background: '#fff', textAlign: 'left', fontSize: 14
            }}
              onMouseEnter={e => e.target.style.background = '#f8fafc'}
              onMouseLeave={e => e.target.style.background = '#fff'}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #4a63e0, #764ba2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0
              }}>
                {a.nombre?.charAt(0)}{a.apellido?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{a.nombre} {a.apellido}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{a.año}° {a.division} · DNI: {a.dni}</div>
              </div>
              <GraduationCap size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.trim().length >= 1 && results.length === 0 && !fetchError && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 20, textAlign: 'center',
          color: '#94a3b8', fontSize: 14, marginTop: 4
        }}>
          No se encontraron estudiantes con ese criterio
        </div>
      )}

      {open && !loading && fetchError && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050,
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 16, textAlign: 'center',
          color: '#dc2626', fontSize: 13, marginTop: 4
        }}>
          {fetchError}
        </div>
      )}
    </div>
  )
}

function CrearCuentaForm({ familia, onBack, onDone }) {
  const [username, setUsername] = useState(familia?.dni?.replace(/\./g, '') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim()) { setError('El nombre de usuario es obligatorio'); return }
    if (password.length < 4) { setError('La contraseña debe tener al menos 4 caracteres'); return }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
      const response = await apiFetch(`${API_BASE}/familias/${familia.id}/crear-usuario/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username: username.trim(), password, familia_id: familia.id }),
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(Object.values(errData).flat().join('. ') || 'Error al crear usuario')
      }
      setSuccess(true)
      setTimeout(() => { onDone(); onBack() }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="agregar-alumno-container">
        <div className="sh-hero">
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Crear Cuenta</h2>
          </div>
        </div>
        <div className="agregar-alumno-form-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CheckCircle2 size={64} style={{ color: '#059669', marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', margin: '0 0 8px' }}>
            Usuario creado exitosamente
          </h2>
          <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>
            El tutor {familia.nombre} {familia.apellido} ya puede iniciar sesión con su usuario y contraseña.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="agregar-alumno-container">
      <div className="sh-hero">
        <div className="sh-hero-left">
          <button onClick={onBack} className="agregar-alumno-btn agregar-alumno-btn-secondary" style={{ marginBottom: 16 }}>
            ← Volver
          </button>
          <p className="sh-hero-welcome">GESTIÓN DE TUTORES</p>
          <h1 className="sh-hero-name">Crear Cuenta</h1>
          <p className="sh-hero-date">
            Tutor: <strong>{familia.nombre} {familia.apellido}</strong> — DNI: {familia.dni}
          </p>
        </div>
      </div>
      <div className="agregar-alumno-form-card">
        <form onSubmit={handleSubmit} className="agregar-alumno-form">
          <div className="agregar-alumno-section">
            <div className="agregar-alumno-grid">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Nombre de Usuario</label>
                <input className="tooltip agregar-alumno-input" type="text" value={username}
                  onChange={e => setUsername(e.target.value)} placeholder="Ingrese el nombre de usuario" required />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Contraseña</label>
                <input className="tooltip agregar-alumno-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Ingrese la contraseña" required />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Confirmar Contraseña</label>
                <input className="tooltip agregar-alumno-input" type="password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirme la contraseña" required />
              </div>
            </div>
          </div>
          {error && (
            <div className="agregar-alumno-error" style={{ marginBottom: 16 }}>
              <XCircle size={20} />
              <span>{error}</span>
            </div>
          )}
          <div className="agregar-alumno-buttons">
            <button type="button" className="tooltip agregar-alumno-btn agregar-alumno-btn-secondary" onClick={onBack}>
              Cancelar
            </button>
            <button type="submit" className="tooltip agregar-alumno-btn agregar-alumno-btn-primary" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AgregarFamilia() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    fechaNacimiento: '',
    direccionCalle: '',
    direccionNumero: '',
    direccionEntreCalles: '',
    direccionTipoVivienda: '',
    direccionPiso: '',
    direccionDepto: '',
    direccionCP: '',
    direccionMunicipalidad: '',
    telefonos: [
      { id: 1, numero: '', tipo: 'padre' }
    ],
    emails: [
      { id: 1, email: '' }
    ],
    observaciones: '',
    lugarNacimiento: '',
    nacionalidad: 'Argentina',
    partido: '',
    sexo: '',
    identidadGenero: '',
    relacion: 'Madre',
  })

  const [errors, setErrors] = useState({})
  const [nextTelefonoId, setNextTelefonoId] = useState(2)
  const [nextEmailId, setNextEmailId] = useState(2)
  const [showCrearCuenta, setShowCrearCuenta] = useState(false)
  const [familiaCreada, setFamiliaCreada] = useState(null)
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleAlphaChange = (e) => {
    const { name, value } = e.target
    const cleaned = stripNonAlpha(value)
    setFormData(prev => ({ ...prev, [name]: cleaned }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleBlurNombre = () => {
    setFormData(prev => ({ ...prev, nombre: capitalizeWords(prev.nombre.trim()) }))
  }

  const handleBlurApellido = () => {
    setFormData(prev => ({ ...prev, apellido: capitalizeWords(prev.apellido.trim()) }))
  }

  const handleDNIChange = (e) => {
    const formatted = formatDNI(e.target.value)
    setFormData(prev => ({ ...prev, dni: formatted }))
  }

  const handleCPChange = (e) => {
    const formatted = formatCP(e.target.value)
    setFormData(prev => ({ ...prev, direccionCP: formatted }))
  }

  const handleDireccionNumeroChange = (e) => {
    const value = e.target.value.replace(/\D/g, '')
    setFormData(prev => ({ ...prev, direccionNumero: value }))
  }

  const handleDireccionPisoChange = (e) => {
    const value = e.target.value.replace(/\D/g, '')
    setFormData(prev => ({ ...prev, direccionPiso: value }))
  }

  const handleBlurAlpha = (name) => () => {
    setFormData(prev => ({ ...prev, [name]: capitalizeWords(prev[name].trim()) }))
  }

  const handleTelefonoChange = (id, field, value) => {
    const formatted = field === 'numero' ? formatPhone(value) : value
    setFormData(prev => ({
      ...prev,
      telefonos: prev.telefonos.map(t =>
        t.id === id ? { ...t, [field]: formatted } : t
      )
    }))
  }

  const agregarTelefono = () => {
    if (formData.telefonos.length < 5) {
      setFormData(prev => ({
        ...prev,
        telefonos: [...prev.telefonos, { id: nextTelefonoId, numero: '', tipo: 'otro' }]
      }))
      setNextTelefonoId(nextTelefonoId + 1)
    }
  }

  const eliminarTelefono = (id) => {
    if (formData.telefonos.length > 1) {
      setFormData(prev => ({
        ...prev,
        telefonos: prev.telefonos.filter(t => t.id !== id)
      }))
    }
  }

  const handleEmailChange = (id, value) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map(e => e.id === id ? { ...e, email: value } : e)
    }))
  }

  const agregarEmail = () => {
    if (formData.emails.length < 3) {
      setFormData(prev => ({
        ...prev,
        emails: [...prev.emails, { id: nextEmailId, email: '' }]
      }))
      setNextEmailId(nextEmailId + 1)
    }
  }

  const eliminarEmail = (id) => {
    if (formData.emails.length > 1) {
      setFormData(prev => ({
        ...prev,
        emails: prev.emails.filter(e => e.id !== id)
      }))
    }
  }

  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const validate = () => {
    const errs = {}
    if (!formData.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    if (!formData.apellido.trim()) errs.apellido = 'El apellido es obligatorio'
    if (!isValidDNI(formData.dni)) errs.dni = 'El DNI debe tener exactamente 8 dígitos'
    if (!formData.direccionCalle.trim()) errs.direccionCalle = 'La calle es obligatoria'
    if (formData.direccionTipoVivienda !== 'otro' && !formData.direccionNumero) errs.direccionNumero = 'El número es obligatorio'
    if (formData.direccionCP && !isValidCP(formData.direccionCP)) errs.direccionCP = 'El código postal debe tener 4 dígitos'
    if (!alumnoSeleccionado) errs.alumno = 'Debe seleccionar un estudiante a cargo'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleLimpiarDatos = () => {
    setFormData({
      nombre: '', apellido: '', dni: '', fechaNacimiento: '',
      direccionCalle: '', direccionNumero: '', direccionEntreCalles: '',
      direccionTipoVivienda: '', direccionPiso: '', direccionDepto: '',
      direccionCP: '', direccionMunicipalidad: '',
      telefonos: [{ id: 1, numero: '', tipo: 'padre' }],
      emails: [{ id: 1, email: '' }],
      observaciones: '',
      lugarNacimiento: '', nacionalidad: 'Argentina', partido: '',
      sexo: '', identidadGenero: '', relacion: 'Madre',
    })
    setAlumnoSeleccionado(null)
    setNextTelefonoId(2)
    setNextEmailId(2)
    setErrors({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const addressObj = {
      calle: capitalizeWords(formData.direccionCalle.trim()),
      numero: formData.direccionNumero,
      entreCalles: capitalizeWords(formData.direccionEntreCalles.trim()),
      tipoVivienda: formData.direccionTipoVivienda,
      piso: formData.direccionPiso,
      depto: formData.direccionDepto.trim(),
      cp: formData.direccionCP,
      municipalidad: capitalizeWords(formData.direccionMunicipalidad.trim())
    }

    const phones = formData.telefonos
      .map(t => unformatPhone(t.numero))
      .filter(Boolean)

    const payload = {
      nombre: capitalizeWords(formData.nombre.trim()),
      apellido: capitalizeWords(formData.apellido.trim()),
      dni: unformatDNI(formData.dni),
      fecha_nacimiento: formData.fechaNacimiento || null,
      lugar_nacimiento: capitalizeWords(formData.lugarNacimiento.trim()),
      nacionalidad: capitalizeWords(formData.nacionalidad.trim()),
      sexo: formData.sexo,
      identidad_genero: formData.identidadGenero,
      direccion: buildAddress(addressObj),
      localidad: capitalizeWords(formData.direccionMunicipalidad.trim()),
      partido: capitalizeWords(formData.partido.trim()),
      telefono: phones[0] || '',
      email: formData.emails.filter(e => e.email.trim())[0]?.email.trim() || '',
      relacion: formData.relacion,
      observaciones: formData.observaciones.trim(),
      alumno_ids: [alumnoSeleccionado.id],
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
      const response = await apiFetch(`${API_BASE}/familias/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || JSON.stringify(errorData))
      }
      const familia = await response.json()
      setFamiliaCreada(familia)
      setShowCrearCuenta(true)
      setShowError(false)
    } catch (error) {
      setErrorMessage(error.message)
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    }
  }

  if (showCrearCuenta) {
    return <CrearCuentaForm familia={familiaCreada} onBack={() => setShowCrearCuenta(false)} onDone={handleLimpiarDatos} />
  }

  return (
    <div className="agregar-alumno-container">
      <div className="sh-hero">
        <div className="sh-hero-left">
          <p className="sh-hero-welcome">GESTIÓN DE TUTORES</p>
          <h1 className="sh-hero-name">Agregar Nuevo Tutor / Familiar</h1>
          <p className="sh-hero-date">
            <Calendar size={13} /> {new Date().toLocaleDateString('es-AR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            }).replace(/^\w/, c => c.toUpperCase())}
          </p>
        </div>
      </div>

      <div className="agregar-alumno-form-card">
        <form onSubmit={handleSubmit} className="agregar-alumno-form">
          <div className="agregar-alumno-section">
            <h2 className="agregar-alumno-section-title">
              <UserPlus size={20} />
              Datos Personales
            </h2>
            <div className="agregar-alumno-grid agregar-alumno-grid-3cols">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Nombre</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el nombre del tutor" type="text" name="nombre" value={formData.nombre} onChange={handleAlphaChange} onBlur={handleBlurNombre} placeholder="Ingrese el nombre" required />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Apellido</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el apellido del tutor" type="text" name="apellido" value={formData.apellido} onChange={handleAlphaChange} onBlur={handleBlurApellido} placeholder="Ingrese el apellido" required />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">DNI</label>
                <input className={`tooltip agregar-alumno-input ${errors.dni ? 'agregar-alumno-input-error' : ''}`} data-tooltip="Ingrese el DNI del tutor (8 dígitos)" type="text" name="dni" value={formData.dni} onChange={handleDNIChange} placeholder="XX.XXX.XXX" required />
                {errors.dni && <span className="agregar-alumno-field-error">{errors.dni}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Fecha de Nacimiento</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Seleccione la fecha de nacimiento del tutor" type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Lugar de Nacimiento</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese la ciudad y provincia de nacimiento" type="text" name="lugarNacimiento" value={formData.lugarNacimiento} onChange={handleChange} onBlur={handleBlurAlpha('lugarNacimiento')} placeholder="Ciudad / Provincia" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Nacionalidad</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese la nacionalidad" type="text" name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} onBlur={handleBlurAlpha('nacionalidad')} placeholder="Nacionalidad" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Sexo</label>
                <select className="tooltip agregar-alumno-select" data-tooltip="Seleccione el sexo" name="sexo" value={formData.sexo} onChange={handleChange}>
                  <option value="">Seleccione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Identidad de Género</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese la identidad de género (opcional)" type="text" name="identidadGenero" value={formData.identidadGenero} onChange={handleChange} placeholder="Identidad de género (opcional)" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Relación con el estudiante</label>
                <select className="tooltip agregar-alumno-select" data-tooltip="Seleccione la relación con el estudiante" name="relacion" value={formData.relacion} onChange={handleChange}>
                  <option value="Madre">Madre</option>
                  <option value="Padre">Padre</option>
                  <option value="Tutor/a">Tutor/a</option>
                </select>
              </div>
            </div>
          </div>

          <div className="agregar-alumno-section">
            <h2 className="agregar-alumno-section-title">
              <User size={20} />
              Estudiante a cargo
            </h2>
            <div className="agregar-alumno-grid agregar-alumno-grid-3cols">
              <div className="agregar-alumno-field" style={{ gridColumn: 'span 3' }}>
                <AlumnoSearchPopup
                  onSelect={setAlumnoSeleccionado}
                  selected={alumnoSeleccionado}
                  onRemove={() => setAlumnoSeleccionado(null)}
                />
                {errors.alumno && <span className="agregar-alumno-field-error">{errors.alumno}</span>}
                {alumnoSeleccionado && (
                  <div style={{
                    background: '#f0fdf4', borderRadius: 8, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 10, marginTop: 8
                  }}>
                    <CheckCircle2 size={16} style={{ color: '#059669', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: '#059669', fontSize: 14 }}>
                      {alumnoSeleccionado.nombre} {alumnoSeleccionado.apellido}
                    </span>
                    <span style={{ color: '#6b7280', fontSize: 13 }}>
                      — {alumnoSeleccionado.año}° {alumnoSeleccionado.division} · DNI: {alumnoSeleccionado.dni}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="agregar-alumno-section">
            <h2 className="agregar-alumno-section-title">
              <MapPin size={20} />
              Dirección
            </h2>
            <div className="agregar-alumno-grid agregar-alumno-grid-3cols">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Calle</label>
                <input className={`tooltip agregar-alumno-input ${errors.direccionCalle ? 'agregar-alumno-input-error' : ''}`} data-tooltip="Ingrese el nombre de la calle" type="text" name="direccionCalle" value={formData.direccionCalle} onChange={handleAlphaChange} onBlur={handleBlurAlpha('direccionCalle')} placeholder="Nombre de la calle" required />
                {errors.direccionCalle && <span className="agregar-alumno-field-error">{errors.direccionCalle}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Número</label>
                <input className={`tooltip agregar-alumno-input ${errors.direccionNumero ? 'agregar-alumno-input-error' : ''}`} data-tooltip="Ingrese el número de la casa" type="text" name="direccionNumero" value={formData.direccionNumero} onChange={handleDireccionNumeroChange} placeholder="N°" onKeyDown={(e) => !isNumericKey(e) && e.preventDefault()} />
                {errors.direccionNumero && <span className="agregar-alumno-field-error">{errors.direccionNumero}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Entre calles</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese las calles entre las que está la vivienda" type="text" name="direccionEntreCalles" value={formData.direccionEntreCalles} onChange={handleAlphaChange} onBlur={handleBlurAlpha('direccionEntreCalles')} placeholder="Entre calles (opcional)" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Tipo de vivienda</label>
                <select className="tooltip agregar-alumno-select" data-tooltip="Seleccione el tipo de vivienda" name="direccionTipoVivienda" value={formData.direccionTipoVivienda} onChange={handleChange}>
                  <option value="">Seleccione...</option>
                  <option value="casa">Casa</option>
                  <option value="edificio">Edificio</option>
                  <option value="departamento">Departamento</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              {formData.direccionTipoVivienda === 'edificio' || formData.direccionTipoVivienda === 'departamento' || formData.direccionTipoVivienda === 'otro' ? (
                <>
                  <div className="agregar-alumno-field">
                    <label className="agregar-alumno-label">Piso</label>
                    <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el número de piso" type="text" name="direccionPiso" value={formData.direccionPiso} onChange={handleDireccionPisoChange} placeholder="N° de piso" onKeyDown={(e) => !isNumericKey(e) && e.preventDefault()} />
                  </div>
                  <div className="agregar-alumno-field">
                    <label className="agregar-alumno-label">Departamento</label>
                    <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el número o letra del departamento" type="text" name="direccionDepto" value={formData.direccionDepto} onChange={handleChange} placeholder="Ej: A, 3B" />
                  </div>
                </>
              ) : null}
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Código Postal</label>
                <input className={`tooltip agregar-alumno-input ${errors.direccionCP ? 'agregar-alumno-input-error' : ''}`} data-tooltip="Ingrese el código postal (4 dígitos)" type="text" name="direccionCP" value={formData.direccionCP} onChange={handleCPChange} placeholder="XXXX" />
                {errors.direccionCP && <span className="agregar-alumno-field-error">{errors.direccionCP}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Localidad</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese la municipalidad o localidad" type="text" name="direccionMunicipalidad" value={formData.direccionMunicipalidad} onChange={handleChange} onBlur={handleBlurAlpha('direccionMunicipalidad')} placeholder="Municipalidad o localidad" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Partido</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el partido o distrito" type="text" name="partido" value={formData.partido} onChange={handleChange} onBlur={handleBlurAlpha('partido')} placeholder="Partido" />
              </div>
            </div>
          </div>

          <div className="agregar-alumno-section">
            <h2 className="agregar-alumno-section-title">
              <Phone size={20} />
              Contacto
            </h2>
            <div className="agregar-alumno-telefonos-section">
              <label className="agregar-alumno-label">Números de Teléfono</label>
              <div className="agregar-alumno-telefonos-list">
                {formData.telefonos.map((telefono) => (
                  <div key={telefono.id} className="agregar-alumno-telefono-row">
                    <div className="agregar-alumno-telefono-input-group">
                      <input maxLength={53} className="tooltip agregar-alumno-input" data-tooltip="Ingrese el número de teléfono" type="tel" value={telefono.numero} onChange={(e) => handleTelefonoChange(telefono.id, 'numero', e.target.value)} placeholder="+54 9 11 XXXX-XXXX" style={{ flex: 1 }} />
                    </div>
                    {formData.telefonos.length > 1 && (
                      <button className="tooltip agregar-alumno-btn-eliminar-telefono" data-tooltip="Eliminar teléfono" type="button" onClick={() => eliminarTelefono(telefono.id)} title="Eliminar teléfono"><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
              {formData.telefonos.length < 5 && (
                <button className="tooltip agregar-alumno-btn-agregar-telefono" data-tooltip="Agregar un nuevo teléfono" type="button" onClick={agregarTelefono}>
                  <Plus size={16} /> Agregar teléfono
                </button>
              )}
            </div>
            <div className="agregar-alumno-telefonos-section" style={{ marginTop: 16 }}>
              <label className="agregar-alumno-label">Emails</label>
              <div className="agregar-alumno-telefonos-list">
                {formData.emails.map((emailItem) => (
                  <div key={emailItem.id} className="agregar-alumno-telefono-row">
                    <div className="agregar-alumno-telefono-input-group">
                      <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el email" type="email" value={emailItem.email} onChange={(e) => handleEmailChange(emailItem.id, e.target.value)} placeholder="Ingrese el email" />
                    </div>
                    {formData.emails.length > 1 && (
                      <button className="tooltip agregar-alumno-btn-eliminar-telefono" data-tooltip="Eliminar email" type="button" onClick={() => eliminarEmail(emailItem.id)} title="Eliminar email"><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
              {formData.emails.length < 3 && (
                <button className="tooltip agregar-alumno-btn-agregar-telefono" data-tooltip="Agregar un nuevo email" type="button" onClick={agregarEmail}>
                  <Plus size={16} /> Agregar email
                </button>
              )}
            </div>
          </div>

          <div className="agregar-alumno-section">
            <h2 className="agregar-alumno-section-title">
              <CheckCircle2 size={20} />
              Observaciones
            </h2>
            <div className="agregar-alumno-field">
              <textarea className="tooltip agregar-alumno-textarea" data-tooltip="Ingrese observaciones adicionales" name="observaciones" value={formData.observaciones} onChange={handleChange} placeholder="Ingrese observaciones adicionales..." rows={4} />
            </div>
          </div>

          <div className="agregar-alumno-buttons">
            <button className="tooltip agregar-alumno-btn agregar-alumno-btn-secondary" data-tooltip="Limpiar todos los datos del formulario" type="button" onClick={handleLimpiarDatos}>
              Limpiar Datos
            </button>
            <button className="tooltip agregar-alumno-btn agregar-alumno-btn-primary" type="submit">
              <CheckCircle2 size={18} />
              Guardar y continuar
            </button>
          </div>
        </form>

        {showError && (
          <div className="agregar-alumno-error">
            <XCircle size={24} />
            <span>Error: {errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  )
}
