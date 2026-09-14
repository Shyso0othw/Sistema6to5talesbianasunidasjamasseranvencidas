import { apiFetch } from '../../api/http.js'
import { useState } from 'react'
import {
  UserPlus, GraduationCap, Phone,
  Calendar, CheckCircle2, XCircle, Plus, Trash2, MapPin
} from 'lucide-react'
import '../../shared.css'
import '../../components/specific/AgregarAlumno.css'
import { API_BASE } from '../../config'
import { capitalizeWords, stripNonAlpha, formatDNI, unformatDNI, isValidDNI, formatPhone, unformatPhone, getMinDateOfBirth, isValidDateOfBirth, formatCP, isValidCP, isNumericKey, stripNonDigits, formatCUIL } from '../../utils/formatters';

export default function AgregarAlumno() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    cuil: '',
    fechaNacimiento: '',
    numeroLegajo: '',
    distritoEscolar: '',
    cicloLectivo: '',
    procedencia: '',
    fechaAdmision: '',
    año: '',
    division: '',
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
  })

  const [errors, setErrors] = useState({})
  const [nextTelefonoId, setNextTelefonoId] = useState(2)
  const [nextEmailId, setNextEmailId] = useState(2)
  const [showCrearCuenta, setShowCrearCuenta] = useState(false)
  const [alumnoCreado, setAlumnoCreado] = useState(null)

  const años = [1, 2, 3, 4, 5, 6, 7]
  const divisionesCicloBasico = ['A', 'B', 'C', 'D']
  const divisionesCicloSuperior = ['1ra', '2da', '3ra', '4ta', '5ta', '6ta']

  const divisionesDisponibles = formData.año && parseInt(formData.año) <= 3
    ? divisionesCicloBasico
    : divisionesCicloSuperior

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

  const handleCUILChange = (e) => {
    const formatted = formatCUIL(e.target.value)
    setFormData(prev => ({ ...prev, cuil: formatted }))
  }

  const handleLegajoChange = (e) => {
    const value = stripNonDigits(e.target.value)
    setFormData(prev => ({ ...prev, numeroLegajo: value }))
  }

  const handleDistritoEscolarChange = (e) => {
    let value = e.target.value
    if (value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1)
    }
    setFormData(prev => ({ ...prev, distritoEscolar: value }))
  }

  const handleBlurAlpha = (name) => () => {
  setFormData(prev => ({
    ...prev,
    [name]: capitalizeWords(prev[name].trim())
  }));
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
        telefonos: [
          ...prev.telefonos,
          { id: nextTelefonoId, numero: '', tipo: 'otro' }
        ]
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
      emails: prev.emails.map(e =>
        e.id === id ? { ...e, email: value } : e
      )
    }))
  }

  const agregarEmail = () => {
    if (formData.emails.length < 3) {
      setFormData(prev => ({
        ...prev,
        emails: [
          ...prev.emails,
          { id: nextEmailId, email: '' }
        ]
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
    if (!isValidDNI(formData.dni)) errs.dni = 'El DNI debe tener exactamente 8 dígitos'
    if (!isValidDateOfBirth(formData.fechaNacimiento)) errs.fechaNacimiento = 'Debe tener al menos 11 años'
    if (formData.direccionCP && !isValidCP(formData.direccionCP)) errs.direccionCP = 'El código postal debe tener 4 dígitos'
    if (!formData.direccionCalle.trim()) errs.direccionCalle = 'La calle es obligatoria'
    if (formData.direccionTipoVivienda !== 'otro' && !formData.direccionNumero) errs.direccionNumero = 'El número es obligatorio'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleLimpiarDatos = () => {
    setFormData({
      nombre: '', apellido: '', dni: '', cuil: '', fechaNacimiento: '',
      numeroLegajo: '', distritoEscolar: '', cicloLectivo: '', procedencia: '', fechaAdmision: '',
      año: '', division: '',
      direccionCalle: '', direccionNumero: '', direccionEntreCalles: '',
      direccionTipoVivienda: '', direccionPiso: '', direccionDepto: '',
      direccionCP: '', direccionMunicipalidad: '',
      telefonos: [
        { id: 1, numero: '', tipo: 'padre' }
      ],
      emails: [
        { id: 1, email: '' }
      ],
      observaciones: '',
      lugarNacimiento: '', nacionalidad: 'Argentina', partido: '',
      sexo: '', identidadGenero: '',
    })
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

    const otrosTelefonos = formData.telefonos
      .map(t => unformatPhone(t.numero))
      .filter(Boolean)

    const dataToSend = {
      nombre: capitalizeWords(formData.nombre.trim()),
      apellido: capitalizeWords(formData.apellido.trim()),
      dni: unformatDNI(formData.dni),
      fecha_nacimiento: formData.fechaNacimiento,
      año: parseInt(formData.año),
      division: formData.division,
      calle: addressObj.calle, numero_calle: addressObj.numero,
      entre_calles: addressObj.entreCalles, tipo_vivienda: addressObj.tipoVivienda,
      piso: addressObj.piso, letra_edificio: addressObj.depto, municipio: addressObj.municipalidad,
      telefonos_tutores: otrosTelefonos.map(numero => ({numero, titulo: 'Tutor'})),
      observaciones: formData.observaciones.trim(),
      lugar_nacimiento: capitalizeWords(formData.lugarNacimiento.trim()),
      nacionalidad: capitalizeWords(formData.nacionalidad.trim()),
      partido: capitalizeWords(formData.partido.trim()),
      sexo: formData.sexo,
      identidad_genero: formData.identidadGenero,
    }

    try {
      const response = await apiFetch(`${API_BASE}/alumnos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || JSON.stringify(errorData))
      }

      const alumno = await response.json()
      setAlumnoCreado(alumno)
      setShowCrearCuenta(true)
      setShowError(false)
    } catch (error) {
      setErrorMessage(error.message)
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    }
  }

  if (showCrearCuenta) {
    return <CrearCuentaForm alumno={alumnoCreado} onBack={() => setShowCrearCuenta(false)} onDone={handleLimpiarDatos} />
  }

  return (
    <div className="agregar-alumno-container">
      <div className="sh-hero">
        <div className="sh-hero-left">
          <p className="sh-hero-welcome">GESTIÓN DE ESTUDIANTES</p>
              <h1 className="sh-hero-name">Agregar Nuevo Estudiante</h1>
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
<input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el nombre completo del alumno" type="text" name="nombre" value={formData.nombre} onChange={handleAlphaChange} onBlur={handleBlurNombre} placeholder="Ingrese el nombre" required />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Apellido</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el apellido completo del alumno" type="text" name="apellido" value={formData.apellido} onChange={handleAlphaChange} onBlur={handleBlurApellido} placeholder="Ingrese el apellido" required />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">DNI</label>
                <input className={`tooltip agregar-alumno-input ${errors.dni ? 'agregar-alumno-input-error' : ''}`} data-tooltip="Ingrese el DNI del alumno (8 dígitos)" type="text" name="dni" value={formData.dni} onChange={handleDNIChange} placeholder="XX.XXX.XXX" required />
                {errors.dni && <span className="agregar-alumno-field-error">{errors.dni}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">CUIL</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el CUIL completo (formato XX-XXXXXXXX-X)" type="text" name="cuil" value={formData.cuil} onChange={handleCUILChange} placeholder="XX-XXXXXXXX-X" maxLength={13} onKeyDown={(e) => !isNumericKey(e) && e.preventDefault()} />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Fecha de Nacimiento</label>
                <input className={`tooltip agregar-alumno-input ${errors.fechaNacimiento ? 'agregar-alumno-input-error' : ''}`} data-tooltip="Seleccione la fecha de nacimiento del alumno" type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} max={getMinDateOfBirth()} required />
                {errors.fechaNacimiento && <span className="agregar-alumno-field-error">{errors.fechaNacimiento}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Lugar de Nacimiento</label>
<input className="tooltip agregar-alumno-input" data-tooltip="Ingrese la ciudad y provincia de nacimiento" type="text" name="lugarNacimiento" value={formData.lugarNacimiento} onChange={handleChange} onBlur={() => setFormData(prev => ({
  ...prev,
  lugarNacimiento: capitalizeWords(prev.lugarNacimiento.trim())
}))} placeholder="Ciudad / Provincia" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Nacionalidad</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese la nacionalidad del alumno" type="text" name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} onBlur={() => setFormData(prev => ({
  ...prev,
  nacionalidad: capitalizeWords(prev.nacionalidad.trim())
}))} placeholder="Nacionalidad" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Sexo</label>
                <select className="tooltip agregar-alumno-select" data-tooltip="Seleccione el sexo del alumno" name="sexo" value={formData.sexo} onChange={handleChange}>
                  <option value="">Seleccione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Identidad de Género</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese la identidad de género (opcional)" type="text" name="identidadGenero" value={formData.identidadGenero} onChange={handleChange} placeholder="Identidad de género (opcional)" />
              </div>
            </div>
          </div>

          <div className="agregar-alumno-section">
            <h2 className="agregar-alumno-section-title">
              <GraduationCap size={20} />
              Datos Académicos
            </h2>
            <div className="agregar-alumno-grid agregar-alumno-grid-3cols">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Año</label>
                <select className="tooltip agregar-alumno-select" data-tooltip="Seleccione el año del alumno" name="año" value={formData.año} onChange={handleChange} required>
                  <option value="">Seleccione un año</option>
                  {años.map(año => (
                    <option key={año} value={año}>{año}° Año</option>
                  ))}
                </select>
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">División</label>
                <select className="tooltip agregar-alumno-select" data-tooltip="Seleccione la división del alumno" name="division" value={formData.division} onChange={handleChange} required disabled={!formData.año}>
                  <option value="">Seleccione una división</option>
                  {divisionesDisponibles.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Número de Legajo</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el número de legajo del alumno" type="text" name="numeroLegajo" value={formData.numeroLegajo} onChange={handleLegajoChange} placeholder="Número de legajo" onKeyDown={(e) => !isNumericKey(e) && e.preventDefault()} />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Distrito Escolar</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el distrito escolar" type="text" name="distritoEscolar" value={formData.distritoEscolar} onChange={handleDistritoEscolarChange} onBlur={handleBlurAlpha('distritoEscolar')} placeholder="Distrito escolar" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Ciclo Lectivo</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el ciclo lectivo" type="text" name="cicloLectivo" value={formData.cicloLectivo} onChange={handleChange} onBlur={handleBlurAlpha('cicloLectivo')} placeholder="Ciclo lectivo" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Procedencia</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese la escuela de procedencia" type="text" name="procedencia" value={formData.procedencia} onChange={handleChange} onBlur={handleBlurAlpha('procedencia')} placeholder="Procedencia" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Fecha de Admisión</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Seleccione la fecha de admisión" type="date" name="fechaAdmision" value={formData.fechaAdmision} onChange={handleChange} />
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
                <input className={`tooltip agregar-alumno-input ${errors.direccionCalle ? 'agregar-alumno-input-error' : ''}`} data-tooltip="Ingrese el nombre de la calle" type="text" name="direccionCalle" value={formData.direccionCalle} onChange={handleAlphaChange} onBlur={() => setFormData(prev => ({
  ...prev,
  direccionCalle: capitalizeWords(prev.direccionCalle.trim())
}))} placeholder="Nombre de la calle" required />
                {errors.direccionCalle && <span className="agregar-alumno-field-error">{errors.direccionCalle}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Número</label>
                <input className={`tooltip agregar-alumno-input ${errors.direccionNumero ? 'agregar-alumno-input-error' : ''}`} data-tooltip="Ingrese el número de la casa" type="text" name="direccionNumero" value={formData.direccionNumero} onChange={handleDireccionNumeroChange} placeholder="N°" onKeyDown={(e) => !isNumericKey(e) && e.preventDefault()} />
                {errors.direccionNumero && <span className="agregar-alumno-field-error">{errors.direccionNumero}</span>}
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Entre calles</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese las calles entre las que está la vivienda" type="text" name="direccionEntreCalles" value={formData.direccionEntreCalles} onChange={handleAlphaChange} onBlur={() => setFormData(prev => ({
  ...prev,
  direccionEntreCalles: capitalizeWords(prev.direccionEntreCalles.trim())
}))} placeholder="Entre calles (opcional)" />
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
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese la municipalidad o localidad" type="text" name="direccionMunicipalidad" value={formData.direccionMunicipalidad} onChange={handleChange} onBlur={() => setFormData(prev => ({
  ...prev,
  direccionMunicipalidad: capitalizeWords(prev.direccionMunicipalidad.trim())
}))} placeholder="Municipalidad o localidad" />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Partido</label>
                <input className="tooltip agregar-alumno-input" data-tooltip="Ingrese el partido o distrito" type="text" name="partido" value={formData.partido} onChange={handleChange} onBlur={() => setFormData(prev => ({
  ...prev,
  partido: capitalizeWords(prev.partido.trim())
}))} placeholder="Partido" />
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
                      <select
                        value={telefono.tipo}
                        onChange={(e) => handleTelefonoChange(telefono.id, 'tipo', e.target.value)}
                        className="agregar-alumno-telefono-tipo"
                        style={{ padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: '8px', minWidth: 100, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151', outline: 'none' }}
                      >
                        <option value="padre">Papá</option>
                        <option value="madre">Mamá</option>
                        <option value="tutor">Tutor/a</option>
                      </select>
                      <input maxLength={53} className="tooltip agregar-alumno-input" data-tooltip="Ingrese el número de teléfono" type="tel" value={telefono.numero} onChange={(e) => handleTelefonoChange(telefono.id, 'numero', e.target.value)} placeholder="+54 9 11 XXXX-XXXX" />
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
              Crear Cuenta
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

function CrearCuentaForm({ alumno, onBack, onDone }) {
  const [username, setUsername] = useState(alumno?.dni?.replace(/\./g, '') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('El nombre de usuario es obligatorio')
      return
    }
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
      const response = await apiFetch(`${API_BASE}/alumnos/${alumno.id}/crear-usuario/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username: username.trim(), password, alumno_id: alumno.id }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(Object.values(errData).flat().join('. ') || 'Error al crear usuario')
      }

      setSuccess(true)
      setTimeout(() => {
        onDone()
        onBack()
      }, 2000)
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
            El estudiante {alumno.nombre} {alumno.apellido} ya puede iniciar sesión con su usuario y contraseña.
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
          <p className="sh-hero-welcome">GESTIÓN DE ESTUDIANTES</p>
          <h1 className="sh-hero-name">Crear Cuenta</h1>
          <p className="sh-hero-date">
            Estudiante: <strong>{alumno.nombre} {alumno.apellido}</strong> — DNI: {alumno.dni}
          </p>
        </div>
      </div>
      <div className="agregar-alumno-form-card">
        <form onSubmit={handleSubmit} className="agregar-alumno-form">
          <div className="agregar-alumno-section">
            <div className="agregar-alumno-grid">
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Nombre de Usuario</label>
                <input
                  className="tooltip agregar-alumno-input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ingrese el nombre de usuario"
                  required
                />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Contraseña</label>
                <input
                  className="tooltip agregar-alumno-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingrese la contraseña"
                  required
                />
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Confirmar Contraseña</label>
                <input
                  className="tooltip agregar-alumno-input"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirme la contraseña"
                  required
                />
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
