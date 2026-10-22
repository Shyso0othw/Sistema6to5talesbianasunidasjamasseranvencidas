import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { UserPlus, Phone, MapPin, Calendar, CheckCircle2, XCircle, Clock, X } from 'lucide-react';
import '../../shared.css'
import { API_BASE } from '../../config'
import '../../components/specific/AgregarAlumno.css'
import {
  capitalizeWords, stripNonAlpha, formatDNI, unformatDNI, isValidDNI,
  formatPhone, unformatPhone, getMinDateOfBirth, isValidDateOfBirth,
  formatCP, isValidCP, buildAddress, isNumericKey
} from '../../utils/formatters'

const TURNOS_DISPONIBLES = ['mañana', 'tarde', 'vespertino']

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || ""
const authHeaders = () => {
  const t = getToken()
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

export default function AgregarPreceptor() {
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
    telefono: '',
    email: '',
    lugarNacimiento: '',
    nacionalidad: 'Argentina',
    partido: '',
    sexo: '',
    identidadGenero: ''
  })

  const [turnos, setTurnos] = useState([])
  const [cursos, setCursos] = useState([])
  const [cursosSeleccionados, setCursosSeleccionados] = useState([])

  const [errors, setErrors] = useState({})
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showCrearCuenta, setShowCrearCuenta] = useState(false)
  const [preceptorCreado, setPreceptorCreado] = useState(null)

  useEffect(() => {
    apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setCursos(data || []) })
      .catch(() => setCursos([]))
  }, [])

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
  setFormData(prev => ({
    ...prev,
    nombre: capitalizeWords(prev.nombre.trim())
  }));
}

  const handleBlurApellido = () => {
  setFormData(prev => ({
    ...prev,
    apellido: capitalizeWords(prev.apellido.trim())
  }));
}

  const handleDNIChange = (e) => {
    setFormData(prev => ({ ...prev, dni: formatDNI(e.target.value) }))
  }

  const handlePhoneChange = (e) => {
    setFormData(prev => ({ ...prev, telefono: formatPhone(e.target.value) }))
  }

  const handleCPChange = (e) => {
    setFormData(prev => ({ ...prev, direccionCP: formatCP(e.target.value) }))
  }

  const handleDireccionNumeroChange = (e) => {
    setFormData(prev => ({ ...prev, direccionNumero: e.target.value.replace(/\D/g, '') }))
  }

  const handleDireccionPisoChange = (e) => {
    setFormData(prev => ({ ...prev, direccionPiso: e.target.value.replace(/\D/g, '') }))
  }

  const validate = () => {
    const errs = {}
    if (!isValidDNI(formData.dni)) errs.dni = 'El DNI debe tener exactamente 8 dígitos'
    if (!isValidDateOfBirth(formData.fechaNacimiento)) errs.fechaNacimiento = 'Debe tener al menos 11 años'
    if (formData.direccionCP && !isValidCP(formData.direccionCP)) errs.direccionCP = 'El código postal debe tener 4 dígitos'
    if (!formData.direccionCalle.trim()) errs.direccionCalle = 'La calle es obligatoria'
    if (!formData.direccionNumero) errs.direccionNumero = 'El número es obligatorio'
    setErrors(errs)
    return Object.keys(errs).length === 0
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

    const dataToSend = {
      nombre: capitalizeWords(formData.nombre.trim()),
      apellido: capitalizeWords(formData.apellido.trim()),
      dni: unformatDNI(formData.dni),
      fecha_nacimiento: formData.fechaNacimiento,
      direccion: buildAddress(addressObj),
      telefono: unformatPhone(formData.telefono),
      email: formData.email.trim(),
      turno: turnos.join(', '),
      cursos_asignados: cursosSeleccionados.map(id => {
        const c = cursos.find(cur => cur.id === id)
        return c ? `${c.año}° ${c.division}` : ''
      }).filter(Boolean).join(', '),
      lugar_nacimiento: capitalizeWords(formData.lugarNacimiento.trim()),
      nacionalidad: capitalizeWords(formData.nacionalidad.trim()),
      partido: capitalizeWords(formData.partido.trim()),
      sexo: formData.sexo,
      identidad_genero: formData.identidadGenero
    }

    try {
      const response = await apiFetch(`${API_BASE}/preceptores/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      if (!response.ok) {
        const text = await response.text()
        let msg = 'Error al guardar preceptor'
        try {
          const errorData = JSON.parse(text)
          msg = errorData.detail || Object.values(errorData).flat().join('. ') || msg
        } catch {
          if (text.includes('IntegrityError') || text.includes('UNIQUE constraint')) msg = 'El DNI ingresado ya existe en el sistema'
          else if (text.length < 200) msg = text
        }
        throw new Error(msg)
      }

      const preceptor = await response.json()
      setPreceptorCreado(preceptor)
      setShowCrearCuenta(true)
      setShowError(false)
    } catch (error) {
      setErrorMessage(error.message)
      setShowError(true)
      setShowSuccess(false)
      setTimeout(() => setShowError(false), 5000)
    }
  }

  const handleLimpiarDatos = () => {
    setShowSuccess(false)
    setFormData({
      nombre: '', apellido: '', dni: '', fechaNacimiento: '',
      direccionCalle: '', direccionNumero: '', direccionEntreCalles: '',
      direccionTipoVivienda: '', direccionPiso: '', direccionDepto: '',
      direccionCP: '', direccionMunicipalidad: '',
      telefono: '', email: '',
      lugarNacimiento: '', nacionalidad: 'Argentina', partido: '',
      sexo: '', identidadGenero: ''
    })
    setTurnos([])
    setCursosSeleccionados([])
    setErrors({})
  }

  if (showCrearCuenta) {
    return <CrearCuentaForm preceptor={preceptorCreado} onBack={() => setShowCrearCuenta(false)} onDone={handleLimpiarDatos} />
  }

  return (
    <div className="agregar-alumno-container">
      <div className="sh-hero">
        <div className="sh-hero-left">
          <p className="sh-hero-welcome">GESTIÓN DE PRECEPTORES</p>
          <h1 className="sh-hero-name">Agregar Nuevo Preceptor</h1>
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
            <div className="agregar-alumno-grid">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Nombre</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleAlphaChange} onBlur={handleBlurNombre} className="agregar-alumno-input" placeholder="Ingrese el nombre" required />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Apellido</label>
                <input type="text" name="apellido" value={formData.apellido} onChange={handleAlphaChange} onBlur={handleBlurApellido} className="agregar-alumno-input" placeholder="Ingrese el apellido" required />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">DNI</label>
                <input type="text" name="dni" value={formData.dni} onChange={handleDNIChange} className={`agregar-alumno-input ${errors.dni ? 'agregar-alumno-input-error' : ''}`} placeholder="XX.XXX.XXX (será su usuario)" required />
                {errors.dni && <span className="agregar-alumno-field-error">{errors.dni}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Fecha de Nacimiento</label>
                <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} max={getMinDateOfBirth()} className={`agregar-alumno-input ${errors.fechaNacimiento ? 'agregar-alumno-input-error' : ''}`} required />
                {errors.fechaNacimiento && <span className="agregar-alumno-field-error">{errors.fechaNacimiento}</span>}
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
                <input type="text" name="direccionCalle" value={formData.direccionCalle} onChange={handleAlphaChange} onBlur={() => setFormData(prev => ({
  ...prev,
  direccionCalle: capitalizeWords(prev.direccionCalle.trim())
}))} className={`agregar-alumno-input ${errors.direccionCalle ? 'agregar-alumno-input-error' : ''}`} placeholder="Nombre de la calle" required />
                {errors.direccionCalle && <span className="agregar-alumno-field-error">{errors.direccionCalle}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Número</label>
                <input type="text" name="direccionNumero" value={formData.direccionNumero} onChange={handleDireccionNumeroChange} className={`agregar-alumno-input ${errors.direccionNumero ? 'agregar-alumno-input-error' : ''}`} placeholder="N°" required onKeyDown={(e) => !isNumericKey(e) && e.preventDefault()} />
                {errors.direccionNumero && <span className="agregar-alumno-field-error">{errors.direccionNumero}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Entre calles</label>
                <input type="text" name="direccionEntreCalles" value={formData.direccionEntreCalles} onChange={handleAlphaChange} onBlur={() => setFormData(prev => ({
  ...prev,
  direccionEntreCalles: capitalizeWords(prev.direccionEntreCalles.trim())
}))} className="agregar-alumno-input" placeholder="Entre calles (opcional)" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Tipo de vivienda</label>
                <select name="direccionTipoVivienda" value={formData.direccionTipoVivienda} onChange={handleChange} className="agregar-alumno-select">
                  <option value="">Seleccione...</option>
                  <option value="casa">Casa</option>
                  <option value="edificio">Edificio</option>
                  <option value="departamento">Departamento</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              {(formData.direccionTipoVivienda === 'edificio' || formData.direccionTipoVivienda === 'departamento' || formData.direccionTipoVivienda === 'otro') && (
                <>
                  <div className="agregar-alumno-field">
                    <label className="agregar-alumno-label">Piso</label>
                    <input type="text" name="direccionPiso" value={formData.direccionPiso} onChange={handleDireccionPisoChange} className="agregar-alumno-input" placeholder="N° de piso" onKeyDown={(e) => !isNumericKey(e) && e.preventDefault()} />
                  </div>
                  <div className="agregar-alumno-field">
                    <label className="agregar-alumno-label">Departamento</label>
                    <input type="text" name="direccionDepto" value={formData.direccionDepto} onChange={handleChange} className="agregar-alumno-input" placeholder="Ej: A, 3B" />
                  </div>
                </>
              )}
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Código Postal</label>
                <input type="text" name="direccionCP" value={formData.direccionCP} onChange={handleCPChange} className={`agregar-alumno-input ${errors.direccionCP ? 'agregar-alumno-input-error' : ''}`} placeholder="XXXX" />
                {errors.direccionCP && <span className="agregar-alumno-field-error">{errors.direccionCP}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Localidad</label>
                <input type="text" name="direccionMunicipalidad" value={formData.direccionMunicipalidad} onChange={handleChange} onBlur={() => setFormData(prev => ({
  ...prev,
  direccionMunicipalidad: capitalizeWords(prev.direccionMunicipalidad.trim())
}))} className="agregar-alumno-input" placeholder="Municipalidad o localidad" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Partido</label>
                <input type="text" name="partido" value={formData.partido} onChange={handleChange} onBlur={() => setFormData(prev => ({
  ...prev,
  partido: capitalizeWords(prev.partido.trim())
}))} className="agregar-alumno-input" placeholder="Partido" />
              </div>
            </div>
          </div>

          <div className="agregar-alumno-section">
            <h2 className="agregar-alumno-section-title">
              <Phone size={20} />
              Contacto
            </h2>
            <div className="agregar-alumno-grid">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="agregar-alumno-input" placeholder="Ingrese el email" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Teléfono</label>
                <input maxLength={53} type="tel" name="telefono" value={formData.telefono} onChange={handlePhoneChange} className="agregar-alumno-input" placeholder="+54 9 11 XXXX-XXXX" />
              </div>
            </div>
          </div>

          <div className="agregar-alumno-section">
            <h2 className="agregar-alumno-section-title">
              <Clock size={20} />
              Asignación
            </h2>
            <div className="agregar-alumno-grid">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Turnos</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {turnos.map(t => (
                    <span key={t} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                      background: '#dbeafe', color: '#1e40af'
                    }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                      <button type="button" onClick={() => setTurnos(prev => prev.filter(x => x !== t))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#1e40af', display: 'flex' }}>
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  {TURNOS_DISPONIBLES.filter(t => !turnos.includes(t)).length > 0 && (
                    <select
                      value=""
                      onChange={e => { if (e.target.value) setTurnos(prev => [...prev, e.target.value]) }}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, minWidth: 120 }}
                    >
                      <option value="">Agregar turno...</option>
                      {TURNOS_DISPONIBLES.filter(t => !turnos.includes(t)).map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="agregar-alumno-field" style={{ gridColumn: '1 / -1' }}>
                <label className="agregar-alumno-label">Cursos Designados</label>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 8, marginTop: 4
                }}>
                  {cursos.map(c => {
                    const label = `${c.año}° ${c.division}`
                    const selected = cursosSeleccionados.includes(c.id)
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setCursosSeleccionados(prev =>
                          selected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                        )}
                        style={{
                          padding: '8px 10px', borderRadius: 8, border: `2px solid ${selected ? '#2563eb' : '#e5e7eb'}`,
                          background: selected ? '#eff6ff' : '#fff', color: selected ? '#1e40af' : '#374151',
                          fontWeight: selected ? 700 : 400, fontSize: 13, cursor: 'pointer',
                          transition: 'all 0.15s', textAlign: 'center'
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="agregar-alumno-section">
            <h2 className="agregar-alumno-section-title">
              <UserPlus size={20} />
              Información Adicional
            </h2>
            <div className="agregar-alumno-grid agregar-alumno-grid-3cols">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Lugar de Nacimiento</label>
                <input type="text" name="lugarNacimiento" value={formData.lugarNacimiento} onChange={handleChange} onBlur={() => setFormData(prev => ({
  ...prev,
  lugarNacimiento: capitalizeWords(prev.lugarNacimiento.trim())
}))} className="agregar-alumno-input" placeholder="Ciudad / Provincia" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Nacionalidad</label>
                <input type="text" name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} onBlur={() => setFormData(prev => ({
  ...prev,
  nacionalidad: capitalizeWords(prev.nacionalidad.trim())
}))} className="agregar-alumno-input" placeholder="Nacionalidad" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Sexo</label>
                <select name="sexo" value={formData.sexo} onChange={handleChange} className="agregar-alumno-select">
                  <option value="">Seleccione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Identidad de Género</label>
                <input type="text" name="identidadGenero" value={formData.identidadGenero} onChange={handleChange} className="agregar-alumno-input" placeholder="Identidad de género (opcional)" />
              </div>
            </div>
          </div>

          <div className="agregar-alumno-buttons">
            <button type="button" className="agregar-alumno-btn agregar-alumno-btn-secondary" onClick={() => {
              setFormData({
                nombre: '', apellido: '', dni: '', fechaNacimiento: '',
                direccionCalle: '', direccionNumero: '', direccionEntreCalles: '',
                direccionTipoVivienda: '', direccionPiso: '', direccionDepto: '',
                direccionCP: '', direccionMunicipalidad: '',
                telefono: '', email: '',
          lugarNacimiento: '', nacionalidad: 'Argentina', partido: '',
                sexo: '', identidadGenero: ''
              })
              setTurnos([])
              setCursosSeleccionados([])
              setErrors({})
            }}>
              Cancelar
            </button>
            <button type="submit" className="agregar-alumno-btn agregar-alumno-btn-primary">
              <CheckCircle2 size={18} />
              Guardar Preceptor
            </button>
          </div>
        </form>

        {showSuccess && (
          <div className="agregar-alumno-success">
            <CheckCircle2 size={24} />
            <span>Preceptor guardado exitosamente!</span>
          </div>
        )}
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

function CrearCuentaForm({ preceptor, onBack, onDone }) {
  const [username, setUsername] = useState(preceptor?.dni?.replace(/\./g, '') || '')
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
      const response = await apiFetch(`${API_BASE}/preceptores/${preceptor.id}/crear-usuario/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ username: username.trim(), password, preceptor_id: preceptor.id }),
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
        <div className="agregar-alumno-form-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CheckCircle2 size={64} style={{ color: '#059669', marginBottom: 16 }} />
          <h2 style={{ color: 'var(--navy)', margin: '0 0 8px' }}>Usuario creado exitosamente</h2>
          <p style={{ color: 'var(--text-muted)' }}>{preceptor.apellido}, {preceptor.nombre}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="agregar-alumno-container">
      <div className="sh-hero">
        <div className="sh-hero-left">
          <p className="sh-hero-welcome">CREAR USUARIO</p>
          <h1 className="sh-hero-name">{preceptor.apellido}, {preceptor.nombre}</h1>
        </div>
      </div>
      <div className="agregar-alumno-form-card">
        <button onClick={onBack} className="agregar-alumno-btn agregar-alumno-btn-secondary" style={{ marginBottom: 16 }}>
          ← Volver
        </button>
        <form onSubmit={handleSubmit} className="agregar-alumno-form">
          <div className="agregar-alumno-section">
            <h2 className="agregar-alumno-section-title">
              <UserPlus size={20} />
              Datos de la Cuenta
            </h2>
            <div className="agregar-alumno-grid">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Nombre de Usuario</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="tooltip agregar-alumno-input" placeholder="Ingrese el nombre de usuario" required />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="tooltip agregar-alumno-input" placeholder="Ingrese la contraseña" required />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Confirmar Contraseña</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="tooltip agregar-alumno-input" placeholder="Confirme la contraseña" required />
              </div>
            </div>
          </div>
          {error && <div className="agregar-alumno-error" style={{ marginBottom: 16 }}><XCircle size={20} /><span>{error}</span></div>}
          <div className="agregar-alumno-buttons">
            <button type="button" className="tooltip agregar-alumno-btn agregar-alumno-btn-secondary" onClick={onBack}>Cancelar</button>
            <button type="submit" disabled={loading} className="agregar-alumno-btn agregar-alumno-btn-primary">
              <UserPlus size={18} />{loading ? 'Creando...' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
