import { apiFetch } from '../../api/http.js'
import { useState } from 'react'
import {
  UserPlus, CheckCircle2, XCircle, Calendar
} from 'lucide-react'
import '../../shared.css'
import '../../components/specific/AgregarAlumno.css'
import { API_BASE } from '../../config'
import {
  capitalizeWords, stripNonAlpha, formatDNI, unformatDNI, isValidDNI,
  formatPhone, unformatPhone
} from '../../utils/formatters'

const ROLES_DISPONIBLES = [
  { value: 'directivo', label: 'Directivo' },
  { value: 'secretaria', label: 'Secretaría' },
  { value: 'eoe', label: 'EOE (Equipo de Orientación Escolar)' },
  { value: 'ematp', label: 'EMATP (Equipo de Asistencia Técnica)' },
  { value: 'auxiliar', label: 'Auxiliar' },
  { value: 'bibliotecario', label: 'Bibliotecario/a' },
]

export default function CrearCuenta() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    rol: '',
  })

  const [errors, setErrors] = useState({})
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showCrearCuenta, setShowCrearCuenta] = useState(false)
  const [staffCreado, setStaffCreado] = useState(null)

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

  const handleDNIChange = (e) => {
    setFormData(prev => ({ ...prev, dni: formatDNI(e.target.value) }))
  }

  const handlePhoneChange = (e) => {
    setFormData(prev => ({ ...prev, telefono: formatPhone(e.target.value) }))
  }

  const handleLimpiarDatos = () => {
    setFormData({ nombre: '', apellido: '', dni: '', telefono: '', email: '', rol: '' })
    setErrors({})
  }

  const validate = () => {
    const errs = {}
    if (!formData.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    if (!formData.apellido.trim()) errs.apellido = 'El apellido es obligatorio'
    if (!isValidDNI(formData.dni)) errs.dni = 'El DNI debe tener exactamente 8 dígitos'
    if (!formData.rol) errs.rol = 'Seleccione un rol'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const dataToSend = {
      nombre: capitalizeWords(formData.nombre.trim()),
      apellido: capitalizeWords(formData.apellido.trim()),
      dni: unformatDNI(formData.dni),
      telefono: unformatPhone(formData.telefono),
      email: formData.email.trim(),
    }

    try {
      const response = await apiFetch(`${API_BASE}/personal-staff/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      if (!response.ok) {
        let errorMsg
        try {
          const errorData = await response.json()
          errorMsg = errorData.detail || Object.values(errorData).flat().join('. ')
        } catch {
          errorMsg = `Error del servidor (${response.status})`
        }
        throw new Error(errorMsg || 'Error al crear el registro')
      }

      const staff = await response.json()
      staff.rol = formData.rol
      setStaffCreado(staff)
      setShowCrearCuenta(true)
      setShowError(false)
    } catch (error) {
      setErrorMessage(error.message)
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    }
  }

  if (showCrearCuenta) {
    return <CrearCuentaForm staff={staffCreado} onBack={() => setShowCrearCuenta(false)} onDone={handleLimpiarDatos} />
  }

  return (
    <div className="agregar-alumno-container">
      <div className="sh-hero">
        <div className="sh-hero-left">
          <p className="sh-hero-welcome">GESTIÓN DE USUARIOS</p>
          <h1 className="sh-hero-name">Crear Cuenta</h1>
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
              Datos del Personal
            </h2>
            <div className="agregar-alumno-grid">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Nombre</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleAlphaChange} onBlur={() => setFormData(prev => ({ ...prev, nombre: capitalizeWords(prev.nombre.trim()) }))} className={`agregar-alumno-input ${errors.nombre ? 'agregar-alumno-input-error' : ''}`} placeholder="Ingrese el nombre" required />
                {errors.nombre && <span className="agregar-alumno-field-error">{errors.nombre}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Apellido</label>
                <input type="text" name="apellido" value={formData.apellido} onChange={handleAlphaChange} onBlur={() => setFormData(prev => ({ ...prev, apellido: capitalizeWords(prev.apellido.trim()) }))} className={`agregar-alumno-input ${errors.apellido ? 'agregar-alumno-input-error' : ''}`} placeholder="Ingrese el apellido" required />
                {errors.apellido && <span className="agregar-alumno-field-error">{errors.apellido}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">DNI</label>
                <input type="text" name="dni" value={formData.dni} onChange={handleDNIChange} className={`agregar-alumno-input ${errors.dni ? 'agregar-alumno-input-error' : ''}`} placeholder="XX.XXX.XXX" required />
                {errors.dni && <span className="agregar-alumno-field-error">{errors.dni}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Rol</label>
                <select name="rol" value={formData.rol} onChange={handleChange} className={`agregar-alumno-select ${errors.rol ? 'agregar-alumno-input-error' : ''}`}>
                  <option value="">Seleccione un rol</option>
                  {ROLES_DISPONIBLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {errors.rol && <span className="agregar-alumno-field-error">{errors.rol}</span>}
              </div>
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

          <div className="agregar-alumno-buttons">
            <button type="button" className="agregar-alumno-btn agregar-alumno-btn-secondary" onClick={handleLimpiarDatos}>
              Cancelar
            </button>
            <button type="submit" className="agregar-alumno-btn agregar-alumno-btn-primary">
              <CheckCircle2 size={18} />
              Continuar
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

function CrearCuentaForm({ staff, onBack, onDone }) {
  const [username, setUsername] = useState(staff?.dni?.replace(/\./g, '') || '')
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
      const response = await apiFetch(`${API_BASE}/personal-staff/${staff.id}/crear-usuario/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username: username.trim(), password, personal_staff_id: staff.id, rol: staff.rol }),
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
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">CUENTA CREADA</p>
            <h1 className="sh-hero-name">¡Usuario designado exitosamente!</h1>
          </div>
        </div>
        <div className="agregar-alumno-form-card">
          <div className="agregar-alumno-success">
            <CheckCircle2 size={48} />
            <span style={{ fontSize: '1.2rem', marginTop: '1rem' }}>
              Usuario <strong>{username}</strong> creado para {staff.nombre} {staff.apellido}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="agregar-alumno-container">
      <div className="sh-hero">
        <div className="sh-hero-left">
          <p className="sh-hero-welcome">DESIGNAR USUARIO</p>
          <h1 className="sh-hero-name">Crear Usuario y Contraseña</h1>
          <p className="sh-hero-date">
            <UserPlus size={13} /> {staff.nombre} {staff.apellido}
          </p>
        </div>
      </div>

      <div className="agregar-alumno-form-card">
        <form onSubmit={handleSubmit} className="agregar-alumno-form">
          <div className="agregar-alumno-section">
            <h2 className="agregar-alumno-section-title">
              <UserPlus size={20} />
              Datos de la Cuenta
            </h2>
            <div className="agregar-alumno-grid">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Nombre de Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="agregar-alumno-input"
                  placeholder="Nombre de usuario"
                  required
                />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="agregar-alumno-input"
                  placeholder="Mínimo 4 caracteres"
                  required
                />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="agregar-alumno-input"
                  placeholder="Repita la contraseña"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="agregar-alumno-error" style={{ marginBottom: '1rem' }}>
              <XCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="agregar-alumno-buttons">
            <button type="button" className="agregar-alumno-btn agregar-alumno-btn-secondary" onClick={onBack}>
              Volver
            </button>
            <button type="submit" className="agregar-alumno-btn agregar-alumno-btn-primary" disabled={loading}>
              <CheckCircle2 size={18} />
              {loading ? 'Creando...' : 'Designar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
