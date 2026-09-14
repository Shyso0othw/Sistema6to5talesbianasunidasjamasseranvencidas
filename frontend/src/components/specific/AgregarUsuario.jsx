import { allowedAssignments, normalizeRole, getUserRoles } from '../../utils/permissions'
import { apiFetch } from '../../api/http.js'
import { useState, useEffect, useRef } from 'react'
import { GraduationCap, Users, BookOpen, Shield, UserCog, FileText, Briefcase, Book, Heart, Activity, CheckCircle2, AlertCircle, Save, UserPlus, Mail, MapPin, X, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { API_BASE } from '../../config'
import { unformatPhone } from '../../utils/formatters';
import '../../shared.css'
import '../../components/specific/AgregarAlumno.css'

const ROLES = [
  { id: 'estudiante',   label: 'Estudiante',    icon: GraduationCap, color: '#4a63e0' },
  { id: 'familia',      label: 'Tutor / Familia', icon: Users,         color: '#059669' },
  { id: 'docente',      label: 'Docente',        icon: BookOpen,       color: '#7c3aed' },
  { id: 'preceptor',    label: 'Preceptor',      icon: Shield,         color: '#d97706' },
  { id: 'jefe_preceptores', label: 'Jefe de Preceptores', icon: Shield, color: '#b45309' },
  { id: 'jefe_area',    label: 'Jefe de Área',   icon: BookOpen,       color: '#6d28d9' },
  { id: 'jefe_departamento', label: 'Jefe de Departamento', icon: BookOpen, color: '#5b21b6' },
  { id: 'directivo',    label: 'Directivo',      icon: UserCog,        color: '#dc2626' },
  { id: 'secretaria',   label: 'Secretaría',     icon: FileText,       color: '#0891b2' },
  { id: 'auxiliar',     label: 'Auxiliar',       icon: Briefcase,      color: '#6366f1' },
  { id: 'bibliotecario',label: 'Bibliotecario/a',icon: Book,           color: '#14b8a6' },
  { id: 'eoe',          label: 'EOE',            icon: Heart,          color: '#ec4899' },
  { id: 'ematp',        label: 'EMATP',          icon: Activity,       color: '#f97316' },
]

const ESTADOS_CIVILES = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión Civil']
const SEXOS = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decirlo']


const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || ""
const authHeaders = () => {
  const t = getToken()
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

function SectionTitle({ icon, children }) {
  return (
    <div className="agregar-alumno-section-title">
      {icon}
      {children}
    </div>
  )
}

function Field({ label, children, error }) {
  return (
    <div className="agregar-alumno-field">
      <label className="agregar-alumno-label">{label}</label>
      {children}
      {error && <span className="agregar-alumno-field-error">{error}</span>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', error, ...props }) {
  return (
    <input
      className={`agregar-alumno-input ${error ? 'agregar-alumno-input-error' : ''}`}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  )
}

function Select({ value, onChange, options, placeholder, error }) {
  return (
    <select
      className={`agregar-alumno-select ${error ? 'agregar-alumno-input-error' : ''}`}
      value={value}
      onChange={onChange}
    >
      <option value="" disabled>{placeholder || 'Seleccionar...'}</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      className="agregar-alumno-textarea"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}

function AutocompleteInput({
  placeholder,
  onSelect,
  selectedItems,
  onRemove
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const [catalog, setCatalog] = useState(null)
  useEffect(() => {
    let active = true
    apiFetch(`${API_BASE}/alumnos/`, {headers:authHeaders()}).then(r => {
      if (!r.ok) throw new Error('No se pudieron cargar los estudiantes')
      return r.json()
    }).then(list => { if(active) setCatalog(list) }).catch(() => { if(active) setCatalog([]) })
    return () => { active = false }
  }, [])
  const results = (catalog || []).filter(a => !selectedItems.some(s => s.id === a.id) && `${a.nombre} ${a.apellido} ${a.dni}`.toLowerCase().includes(query.toLowerCase().trim()))
  const loading = catalog === null

  const handleSelect = (a) => {
    onSelect(a)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {selectedItems.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#eef2ff', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
            <a href={`/alumnos/${a.id}`} target="_blank" style={{ color: '#4a63e0', textDecoration: 'none' }}>
              {a.apellido}, {a.nombre} {a.dni ? `(${a.dni})` : ''}
            </a>
            <button type="button" onClick={() => onRemove(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a63e0', padding: 0, display: 'flex' }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <input
        className="agregar-alumno-input"
        placeholder={placeholder}
        value={query}
        onChange={e => {setQuery(e.target.value);setOpen(true)}}
        onFocus={() => results.length > 0 && setOpen(true)}
        style={{ width: '100%', boxSizing: 'border-box' }}
      />
      {open && query.trim().length >= 1 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflow: 'auto', marginTop: 4 }}>
          {loading && <p style={{ padding: 12, textAlign: 'center', color: '#999', margin: 0, fontSize: 13 }}>Buscando...</p>}
          {!loading && results.length === 0 && (
            <p style={{ padding: 12, textAlign: 'center', color: '#999', margin: 0, fontSize: 13 }}>Sin resultados</p>
          )}
          {results.map(a => (
            <div
              key={a.id}
              onMouseDown={() => handleSelect(a)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f6f6'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4a63e0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                {a.nombre?.[0]}{a.apellido?.[0]}
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 14 }}>{a.apellido}, {a.nombre}</strong>
                <p style={{ margin: 0, fontSize: 12, color: '#667781' }}>DNI: {a.dni} · {a.año}° {a.division}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CrearCuentaForm({ personId, personType, onBack, onDone }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const getCreateUrl = () => {
    const map = {
      estudiante: `${API_BASE}/alumnos/${personId}/crear-usuario/`,
      familia: `${API_BASE}/familias/${personId}/crear-usuario/`,
      docente: `${API_BASE}/docentes/${personId}/crear-usuario/`,
      preceptor: `${API_BASE}/preceptores/${personId}/crear-usuario/`,
      jefe_preceptores: `${API_BASE}/preceptores/${personId}/crear-usuario/`,
    }
    if (map[personType]) return map[personType]
    return `${API_BASE}/personal-staff/${personId}/crear-usuario/`
  }

  const getRolParam = () => {
    const map = {
      estudiante: null, familia: null, docente: null, preceptor: null,
      directivo: 'directivo', secretaria: 'secretaria', auxiliar: 'auxiliar',
      bibliotecario: 'bibliotecario', eoe: 'eoe', ematp: 'ematp',
    }
    return map[personType] || personType
  }

  const payload = () => {
    const base = { username, password }
    const map = {
      estudiante: { ...base, alumno_id: personId },
      familia: { ...base, familia_id: personId },
      docente: { ...base, docente_id: personId },
      preceptor: { ...base, preceptor_id: personId },
    }
    if (map[personType]) return map[personType]
    return { ...base, personal_staff_id: personId, rol: getRolParam() }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const r = await apiFetch(getCreateUrl(), { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload()) })
      if (!r.ok) { const d = await r.json(); throw new Error(Object.values(d).flat().join('. ')) }
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <CheckCircle2 size={48} style={{ color: '#059669', marginBottom: 16 }} />
        <h3 style={{ margin: '0 0 8px' }}>Usuario creado exitosamente</h3>
        <p style={{ color: '#667781', margin: '0 0 20px' }}>Usuario: <strong>{username}</strong></p>
        <button className="agregar-alumno-btn agregar-alumno-btn-primary" onClick={onDone}>
          <UserPlus size={16} /> Agregar otro usuario
        </button>
      </div>
    )
  }

  return (
    <div className="agregar-alumno-form-card">
      <SectionTitle icon={<UserPlus size={20} />}>Crear cuenta de usuario</SectionTitle>
      {error && <div className="agregar-alumno-error"><AlertCircle size={18} />{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="agregar-alumno-grid">
          <Field label="Nombre de usuario">
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Ej: juan.perez" required />
          </Field>
          <Field label="Contraseña">
            <div style={{ position: 'relative' }}>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mín. 8 caracteres" required minLength={8}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#667781', padding: 4 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
        </div>
        <div className="agregar-alumno-buttons">
          <button type="button" className="agregar-alumno-btn agregar-alumno-btn-secondary" onClick={onBack}>Volver</button>
          <button type="submit" className="agregar-alumno-btn agregar-alumno-btn-primary" disabled={submitting}>
            <Save size={16} /> {submitting ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </div>
  )
}

function initialPerson(d) {
  const defaults = {
    nombre: '', apellido: '', dni: '', cuil: '', fecha_nacimiento: '',
    lugar_nacimiento: '', nacionalidad: 'Argentina', sexo: '', identidad_genero: '',
    estado_civil: '', ocupacion: '',
    calle: '', numero_calle: '', entre_calles: '', tipo_vivienda: '',
    piso: '', letra_edificio: '', letra_ph: '', municipio: '',
    localidad: '',
    telefono: '', email: '',
    año: '', division: '', grupo: 'A', telefonos_tutores: [{ numero: '', titulo: 'Padre/Madre/Tutor' }],
    observaciones: '',
    turno: [], cursos_asignados: [], materiasAsignadas: [],
    relacion: '',
    email_abc: '',
    codigo_asi: '', codigo_esp: '', fecha_ingreso: '',
    cargo: '', cargo_al_ingresar: '', estado: '',
    tipo_listado: '', tipo_listado_al_ingresar: '', situacion_revista: '',
    reemplaza_a: '', tipo_licencia: '', motivo_licencia: '',
    fecha_inicio_licencia: '', fecha_fin_licencia: '',
    titulos_habilitantes: '',
  }
  if (!d) return defaults
  return {...defaults,
        nombre: d.nombre || '',
        apellido: d.apellido || '',
        dni: d.dni || '',
        cuil: d.cuil || '',
        fecha_nacimiento: d.fecha_nacimiento || '',
        lugar_nacimiento: d.lugar_nacimiento || '',
        nacionalidad: d.nacionalidad || 'Argentina',
        sexo: d.sexo || '',
        identidad_genero: d.identidad_genero || '',
        estado_civil: d.estado_civil || '',
        ocupacion: d.ocupacion || '',
        calle: d.calle || '',
        numero_calle: d.numero_calle || '',
        entre_calles: d.entre_calles || '',
        tipo_vivienda: d.tipo_vivienda || '',
        piso: d.piso || '',
        letra_edificio: d.letra_edificio || '',
        letra_ph: d.letra_ph || '',
        municipio: d.municipio || '',
        localidad: d.localidad || '',
        telefono: d.telefono || '',
        email: d.email || '',
        año: d.año || '',
        division: d.division || '',
        grupo: d.grupo || 'A',
        telefono_padre: d.telefonos_tutores?.find(t => t.titulo === 'Padre')?.numero || '',
        telefono_madre: d.telefonos_tutores?.find(t => t.titulo === 'Madre')?.numero || '',
        obra_social: d.obra_social || '',
        numero_afiliado: d.numero_afiliado || '',
        grupo_sanguineo: d.grupo_sanguineo || '',
        factor_rh: d.factor_rh || '',
        alergias: d.alergias || '',
        medicacion: d.medicacion || '',
        enfermedades_preexistentes: d.enfermedades_preexistentes || '',
        contacto_emergencia_nombre: d.contacto_emergencia_nombre || '',
        contacto_emergencia_telefono: d.contacto_emergencia_telefono || '',
        observaciones_salud: d.observaciones_salud || '',
        telefonos_tutores: d.telefonos_tutores?.length ? d.telefonos_tutores.filter(t => !['Padre','Madre'].includes(t.titulo)) : [{ numero: '', titulo: 'Padre/Madre/Tutor' }],
        observaciones: d.observaciones || '',
        relacion: d.relacion || '',
        cargo: d.cargo || '',
        departamento: d.departamento || '',
        materiasAsignadas: d.materias || [],
        materia: d.materia || '',
        turno: d.turno ? (typeof d.turno === 'string' ? d.turno.split(',').map(s => s.trim()).filter(Boolean) : d.turno) : [],
        cursos_asignados: d.cursos_asignados ? (typeof d.cursos_asignados === 'string' ? d.cursos_asignados.split(',').map(s => s.trim()).filter(Boolean) : d.cursos_asignados) : [],
        email_abc: d.email_abc || '',
        codigo_asi: d.codigo_asi || '',
        codigo_esp: d.codigo_esp || '',
        fecha_ingreso: d.fecha_ingreso || '',
        cargo_al_ingresar: d.cargo_al_ingresar || '',
        estado: d.estado || '',
        tipo_listado: d.tipo_listado || '',
        tipo_listado_al_ingresar: d.tipo_listado_al_ingresar || '',
        situacion_revista: d.situacion_revista || '',
        reemplaza_a: d.reemplaza_a || '',
        tipo_licencia: d.tipo_licencia || '',
        motivo_licencia: d.motivo_licencia || '',
        fecha_inicio_licencia: d.fecha_inicio_licencia || '',
        fecha_fin_licencia: d.fecha_fin_licencia || '',
        titulos_habilitantes: d.titulos_habilitantes || '',
  }
}
export default function AgregarUsuario(props) {
  return <PersonForm key={`${props.defaultRol || ''}:${props.userToEdit?.id || 'new'}`} {...props} />
}

function PersonForm({ userToEdit, onEditSuccess, onCancel, defaultRol }) {
  const [rol, setRol] = useState(defaultRol || '')
  const [cursos, setCursos] = useState([])
  const [materias, setMaterias] = useState([])
  const [materiaSearchQuery, setMateriaSearchQuery] = useState('')

  const filteredMaterias = materias.filter(m =>
    m.nombre.toLowerCase().includes(materiaSearchQuery.toLowerCase())
  )
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState(() => userToEdit?.alumnos || [])
  const [showCrearCuenta, setShowCrearCuenta] = useState(false)
  const [personaCreada, setPersonaCreada] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [errors, setErrors] = useState({})

  const [f, setF] = useState(() => initialPerson(userToEdit))

  useEffect(() => {
    apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() })
      .then(r => r.json()).then(setCursos).catch(() => {})
    apiFetch(`${API_BASE}/materias/`, { headers: authHeaders() })
      .then(r => r.json()).then(setMaterias).catch(() => {})
  }, [])


  const set = (k) => (e) => {
    let v = e.target ? e.target.value : e
    if (k === 'nombre' || k === 'apellido') {
      v = v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
      v = v.replace(/\b\w/g, char => char.toUpperCase())
    }
    if (['calle', 'localidad', 'municipio', 'entre_calles'].includes(k)) {
      v = v.replace(/\b\w/g, char => char.toUpperCase())
    }
    if (['letra_edificio', 'letra_ph'].includes(k)) {
      v = v.replace(/[^a-zA-Z]/g, '').toUpperCase()
    }
    if (['numero_calle', 'piso', 'numero_afiliado'].includes(k)) {
      v = v.replace(/\D/g, '')
    }
    if (k === 'dni') {
      v = v.replace(/\D/g, '').slice(0, 8)
      if (v.length > 2) v = v.slice(0, 2) + '.' + v.slice(2)
      if (v.length > 6) v = v.slice(0, 6) + '.' + v.slice(6)
    }
    if (k === 'cuil') {
      v = v.replace(/\D/g, '').slice(0, 11)
      if (v.length > 2) v = v.slice(0, 2) + '-' + v.slice(2)
      if (v.length > 11) v = v.slice(0, 11) + '-' + v.slice(11)
    }
    setF(prev => ({ ...prev, [k]: v }))
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: '' }))
  }

  const handleRolSelect = (id) => {
    setRol(id)
    setSuccess('')
    setError('')
    setErrors({})
    setShowCrearCuenta(false)
    setPersonaCreada(null)
  }

  const isPersonalStaff = ['directivo', 'secretaria', 'auxiliar', 'bibliotecario', 'eoe', 'ematp'].includes(rol)

  const getCreateUrl = () => {
    if (rol === 'estudiante') return `${API_BASE}/alumnos/`
    if (rol === 'familia') return `${API_BASE}/familias/`
    if (rol === 'docente') return `${API_BASE}/docentes/`
    if (rol === 'preceptor' || rol === 'jefe_preceptores') return `${API_BASE}/preceptores/`
    return `${API_BASE}/personal-staff/`
  }

  const getPayload = () => {
    const base = {
      nombre: f.nombre, apellido: f.apellido, dni: f.dni, cuil: f.cuil,
    }
    const addressBase = {
      calle: f.calle, numero_calle: f.numero_calle, entre_calles: f.entre_calles,
      tipo_vivienda: f.tipo_vivienda, piso: f.piso, letra_edificio: f.letra_edificio,
      letra_ph: f.letra_ph, municipio: f.municipio, localidad: f.localidad,
    }

    if (rol === 'estudiante') return {
      ...base, ...addressBase,
      fecha_nacimiento: f.fecha_nacimiento,
      año: Number(f.año), division: f.division, grupo: f.grupo,
      lugar_nacimiento: f.lugar_nacimiento, nacionalidad: f.nacionalidad,
      sexo: f.sexo, identidad_genero: f.identidad_genero,
      telefonos_tutores: [{titulo:'Padre',numero:f.telefono_padre || ''},{titulo:'Madre',numero:f.telefono_madre || ''},...f.telefonos_tutores].filter(t => t.numero),
      ...(getUserRoles().some(role => ['admin', 'director', 'secretario'].includes(normalizeRole(role))) ? {
      obra_social: f.obra_social || '',
      numero_afiliado: f.numero_afiliado || '',
      grupo_sanguineo: f.grupo_sanguineo || '',
      factor_rh: f.factor_rh || '',
      alergias: f.alergias || '',
      medicacion: f.medicacion || '',
      enfermedades_preexistentes: f.enfermedades_preexistentes || '',
      contacto_emergencia_nombre: f.contacto_emergencia_nombre || '',
      contacto_emergencia_telefono: f.contacto_emergencia_telefono ? unformatPhone(f.contacto_emergencia_telefono) : '',
      observaciones_salud: f.observaciones_salud || '',
      } : {}),
      observaciones: f.observaciones,
    }
    if (rol === 'familia') return {
      ...base, ...addressBase,
      fecha_nacimiento: f.fecha_nacimiento || null,
      lugar_nacimiento: f.lugar_nacimiento, nacionalidad: f.nacionalidad,
      sexo: f.sexo, identidad_genero: f.identidad_genero,
      estado_civil: f.estado_civil, ocupacion: f.ocupacion,
      telefono: unformatPhone(f.telefono), email: f.email,
      relacion: f.relacion, observaciones: f.observaciones,
      alumno_ids: alumnosSeleccionados.map(a => a.id),
    }
    if (rol === 'docente') return {
      ...base, ...addressBase,
      fecha_nacimiento: f.fecha_nacimiento,
      lugar_nacimiento: f.lugar_nacimiento, nacionalidad: f.nacionalidad,
      sexo: f.sexo, identidad_genero: f.identidad_genero,
      telefono: unformatPhone(f.telefono), email: f.email,
      materias: f.materiasAsignadas,
      cursos_asignados: f.cursos_asignados,
      cargo: 'Profesor',
    }
    if (rol === 'preceptor' || rol === 'jefe_preceptores') return {
      ...base, ...addressBase,
      fecha_nacimiento: f.fecha_nacimiento || null,
      sexo: f.sexo, identidad_genero: f.identidad_genero, estado_civil: f.estado_civil,
      telefono: unformatPhone(f.telefono), email: f.email,
      turno: f.turno.join(', '), cursos_asignados: f.cursos_asignados.join(', '),
      cargo: rol === 'jefe_preceptores' ? 'Jefe de Preceptores' : 'Preceptor',
    }
    const staffBase = {
      ...base, ...addressBase,
      lugar_nacimiento: f.lugar_nacimiento, nacionalidad: f.nacionalidad,
      fecha_nacimiento: f.fecha_nacimiento || null,
      sexo: f.sexo, identidad_genero: f.identidad_genero, estado_civil: f.estado_civil,
      telefono: unformatPhone(f.telefono), email: f.email,
      cargo: rol,
    }
    if (rol === 'directivo') return {
      ...staffBase,
      email_abc: f.email_abc,
      codigo_asi: f.codigo_asi, codigo_esp: f.codigo_esp,
      fecha_ingreso: f.fecha_ingreso || null,
      cargo: f.cargo, cargo_al_ingresar: f.cargo_al_ingresar,
      estado: f.estado,
      tipo_listado: f.tipo_listado, tipo_listado_al_ingresar: f.tipo_listado_al_ingresar,
      situacion_revista: f.situacion_revista,
      reemplaza_a: f.reemplaza_a, tipo_licencia: f.tipo_licencia,
      motivo_licencia: f.motivo_licencia,
      fecha_inicio_licencia: f.fecha_inicio_licencia || null,
      fecha_fin_licencia: f.fecha_fin_licencia || null,
      titulos_habilitantes: f.titulos_habilitantes,
    }
    return staffBase
  }

  const validate = () => {
    const e = {}
    if (!f.nombre.trim()) e.nombre = 'Requerido'
    if (!f.apellido.trim()) e.apellido = 'Requerido'
    if (!f.dni.trim()) e.dni = 'Requerido'
    
    if (!f.fecha_nacimiento && rol !== 'familia' && !isPersonalStaff) {
      e.fecha_nacimiento = 'Requerido'
    } else if (f.fecha_nacimiento) {
      const nacimiento = new Date(f.fecha_nacimiento)
      const hoy = new Date()
      let edad = hoy.getFullYear() - nacimiento.getFullYear()
      const mes = hoy.getMonth() - nacimiento.getMonth()
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--
      }
      if (rol === 'estudiante' && edad < 11) {
        e.fecha_nacimiento = 'El estudiante debe tener al menos 11 años'
      }
      if (rol !== 'estudiante' && edad < 18) {
        e.fecha_nacimiento = 'Debe ser mayor de edad (18 años o más)'
      }
    }

    if (rol === 'estudiante') {
      if (!f.año) e.año = 'Requerido'
      if (!f.division) e.division = 'Requerido'
    }
    if (rol === 'familia' && alumnosSeleccionados.length === 0) e.alumnos = 'Seleccioná al menos un estudiante'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      setError('Por favor, revisá los campos resaltados y asegurate de completar todos los obligatorios.')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const isEdit = !!userToEdit
      const url = isEdit ? `${getCreateUrl()}${userToEdit.id}/` : getCreateUrl()
      const method = isEdit ? 'PUT' : 'POST'
      
      const r = await apiFetch(url, { method, headers: authHeaders(), body: JSON.stringify(getPayload()) })
      const d = await r.json()
      if (!r.ok) {
        const msg = Object.values(d).flat().join('. ')
        throw new Error(msg || 'Error al crear')
      }
      setSuccess(`${rol === 'estudiante' ? 'Estudiante' : rol === 'familia' ? 'Tutor' : rol.charAt(0).toUpperCase() + rol.slice(1)} ${isEdit ? 'actualizado' : 'creado'} correctamente`)
      if (isEdit && onEditSuccess) {
        onEditSuccess(d)
        return
      }
      setPersonaCreada(d)
      setShowCrearCuenta(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLimpiarDatos = () => {
    setF({
      nombre: '', apellido: '', dni: '', cuil: '', fecha_nacimiento: '',
      lugar_nacimiento: '', nacionalidad: 'Argentina', sexo: '', identidad_genero: '',
      estado_civil: '', ocupacion: '',
      direccion: '', localidad: '',
      telefono: '', email: '',
      año: '', division: '', telefono_padre: '', telefono_madre: '',
      obra_social: '', numero_afiliado: '', grupo_sanguineo: '', factor_rh: '',
      alergias: '', medicacion: '', enfermedades_preexistentes: '',
      contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
      observaciones_salud: '', observaciones: '',
      turno: [], cursos_asignados: [], materiasAsignadas: [],
      relacion: '',
      email_abc: '',
      codigo_asi: '', codigo_esp: '', fecha_ingreso: '',
      cargo: '', cargo_al_ingresar: '', estado: '',
      tipo_listado: '', tipo_listado_al_ingresar: '', situacion_revista: '',
      reemplaza_a: '', tipo_licencia: '', motivo_licencia: '',
      fecha_inicio_licencia: '', fecha_fin_licencia: '',
      titulos_habilitantes: '',
    })
    setAlumnosSeleccionados([])
    setShowCrearCuenta(false)
    setPersonaCreada(null)
    setSuccess('')
    setError('')
    setErrors({})
    setRol('')
  }

  // --- RENDER ---

  if (showCrearCuenta && personaCreada) {
    return (
      <div className="agregar-alumno-container">
        {success && <div className="agregar-alumno-success"><CheckCircle2 size={18} />{success}</div>}
        <CrearCuentaForm
          personId={personaCreada.id}
          personType={rol}
          onBack={() => setShowCrearCuenta(false)}
          onDone={handleLimpiarDatos}
        />
      </div>
    )
  }

  return (
    <div className="agregar-alumno-container">
      <div className="agregar-alumno-form-card" style={{ marginTop: 0 }}>
        {success && <div className="agregar-alumno-success"><CheckCircle2 size={18} />{success}</div>}
        {error && <div className="agregar-alumno-error"><AlertCircle size={18} />{error}</div>}

        <SectionTitle icon={<UserPlus size={20} />}>
          {rol ? `Agregar ${ROLES.find(r => r.id === rol)?.label}` : 'Agregar Usuario'}
        </SectionTitle>

        <div style={{ marginBottom: 24 }}>
          <h2 className="sh-hero-title">{userToEdit ? 'Editar Usuario' : 'Agregar Usuario'}</h2>
          <p className="sh-hero-subtitle">{userToEdit ? 'Modificar datos del usuario seleccionado' : 'Registrar un nuevo integrante en el sistema escolar'}</p>
        </div>
        {onCancel && (
          <button className="sh-btn-ghost" onClick={onCancel} style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.1)' }}>
            <X size={18} /> Cancelar Edición
          </button>
        )}

        {!rol ? (
          !userToEdit && (
            <div className="sh-card">
              <div className="agregar-alumno-roles">
                {ROLES.filter(role => allowedAssignments().has(normalizeRole(role.id))).map(r => (
                  <button
                    key={r.id}
                    className="agregar-alumno-role-btn"
                    onClick={() => handleRolSelect(r.id)}
                    style={{ '--hover-color': r.color }}
                  >
                    <div className="agregar-alumno-role-icon" style={{ color: r.color, backgroundColor: `${r.color}15` }}>
                      <r.icon size={24} />
                    </div>
                    <span className="agregar-alumno-role-label">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <form onSubmit={handleSubmit} className="agregar-alumno-form">
            {/* === DATOS PERSONALES === */}
            <div className="agregar-alumno-section">
              <SectionTitle icon={<UserPlus size={20} />}>Datos Personales</SectionTitle>
              <div className="agregar-alumno-grid">
                <Field label="Nombre" error={errors.nombre}>
                  <Input value={f.nombre} onChange={set('nombre')} placeholder="Nombre" />
                </Field>
                <Field label="Apellido" error={errors.apellido}>
                  <Input value={f.apellido} onChange={set('apellido')} placeholder="Apellido" />
                </Field>
                <Field label="DNI" error={errors.dni}>
                  <Input value={f.dni} onChange={set('dni')} placeholder="N° de documento" />
                </Field>
                <Field label="CUIL">
                  <Input value={f.cuil} onChange={set('cuil')} placeholder="XX-XXXXXXXX-X" />
                </Field>
                <Field label="Fecha de Nacimiento" error={errors.fecha_nacimiento}>
                  <Input type="date" value={f.fecha_nacimiento} onChange={set('fecha_nacimiento')} />
                </Field>
                <Field label="Lugar de Nacimiento">
                  <Input value={f.lugar_nacimiento} onChange={set('lugar_nacimiento')} placeholder="Ciudad / Provincia" />
                </Field>
                <Field label="Nacionalidad">
                  <Select value={f.nacionalidad} onChange={set('nacionalidad')} options={['Argentina', 'Paraguay', 'Bolivia', 'Uruguay', 'Chile', 'Perú', 'Brasil', 'Colombia', 'Venezuela', 'Otro']} />
                </Field>
                <Field label="Sexo">
                  <Select value={f.sexo} onChange={set('sexo')} options={SEXOS} placeholder="Seleccionar sexo" />
                </Field>
                {rol !== 'docente' && (
                  <Field label="Identidad de Género">
                    <Input value={f.identidad_genero} onChange={set('identidad_genero')} placeholder="Opcional" />
                  </Field>
                )}
                {(rol === 'familia' || rol === 'auxiliar' || rol === 'directivo') && (
                  <Field label="Estado Civil">
                    <Select value={f.estado_civil} onChange={set('estado_civil')} options={ESTADOS_CIVILES} placeholder="Seleccionar estado civil" />
                  </Field>
                )}
                {rol === 'familia' && (
                  <Field label="Ocupación">
                    <Input value={f.ocupacion} onChange={set('ocupacion')} placeholder="Ej: Docente, Comerciante..." />
                  </Field>
                )}
              </div>
            </div>

            {/* === DIRECCIÓN === */}
            <div className="agregar-alumno-section">
              <SectionTitle icon={<MapPin size={20} />}>Dirección</SectionTitle>
              <div className="agregar-alumno-grid">
                <Field label="Calle">
                  <Input value={f.calle} onChange={set('calle')} placeholder="Nombre de calle" />
                </Field>
                <Field label="Número">
                  <Input value={f.numero_calle} onChange={set('numero_calle')} placeholder="N°" />
                </Field>
                <Field label="Entre calles">
                  <Input value={f.entre_calles} onChange={set('entre_calles')} placeholder="Ej: San Martín y Belgrano" />
                </Field>
                <Field label="Tipo de Vivienda">
                  <Select value={f.tipo_vivienda} onChange={set('tipo_vivienda')} options={['Casa', 'Departamento', 'PH', 'Otro']} placeholder="Seleccionar" />
                </Field>
                {f.tipo_vivienda && f.tipo_vivienda !== 'Casa' && (
                  <>
                    <Field label="Piso">
                      <Input value={f.piso} onChange={set('piso')} placeholder="Ej: 2" />
                    </Field>
                    <Field label="Letra Edificio">
                      <Input value={f.letra_edificio} onChange={set('letra_edificio')} placeholder="Ej: A" />
                    </Field>
                    {f.tipo_vivienda === 'Departamento' ? null : (
                      <Field label="Letra PH">
                        <Input value={f.letra_ph} onChange={set('letra_ph')} placeholder="Ej: B" />
                      </Field>
                    )}
                  </>
                )}
                <Field label="Municipio">
                  <Input value={f.municipio} onChange={set('municipio')} placeholder="Municipio" />
                </Field>
                <Field label="Localidad">
                  <Input value={f.localidad} onChange={set('localidad')} placeholder="Localidad" />
                </Field>
              </div>
            </div>

            {/* === CONTACTO === */}
            <div className="agregar-alumno-section">
              <SectionTitle icon={<Mail size={20} />}>Contacto</SectionTitle>
              <div className="agregar-alumno-grid">
                {rol === 'estudiante' ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="agregar-alumno-grid">
                      <Field label="Teléfono de Padre / Tutor">
                        <Input name="telefono_padre" value={f.telefono_padre} onChange={e => setF(prev => ({...prev, telefono_padre: e.target.value}))} placeholder="Ej: +54 9 11 1234-5678 o 1112345678" type="tel" maxLength={53} />
                      </Field>
                      <Field label="Teléfono de Madre / Tutora">
                        <Input name="telefono_madre" value={f.telefono_madre} onChange={e => setF(prev => ({...prev, telefono_madre: e.target.value}))} placeholder="Ej: +54 9 11 1234-5678 o 1112345678" type="tel" maxLength={53} />
                      </Field>
                    </div>
                    <label className="agregar-alumno-label" style={{ marginTop: 20 }}>Otros Teléfonos</label>
                    {f.telefonos_tutores.map((tel, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                        <Input value={tel.titulo} onChange={e => {
                          const newTel = [...f.telefonos_tutores];
                          newTel[idx].titulo = e.target.value;
                          setF({...f, telefonos_tutores: newTel});
                        }} placeholder="Ej: Tío, Abuela..." style={{ flex: 1 }} />
                        <Input value={tel.numero} onChange={e => {
                          const newTel = [...f.telefonos_tutores];
                          newTel[idx].numero = e.target.value;
                          setF({...f, telefonos_tutores: newTel});
                        }} placeholder="Ej: +54 9 11 1234-5678 o 1112345678" style={{ flex: 2 }} type="tel" maxLength={53} />
                        <button type="button" onClick={() => {
                          if (f.telefonos_tutores.length > 1) {
                            setF({...f, telefonos_tutores: f.telefonos_tutores.filter((_, i) => i !== idx)});
                          }
                        }} style={{ padding: '0 10px', background: 'none', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: 4, cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setF({...f, telefonos_tutores: [...f.telefonos_tutores, { titulo: '', numero: '' }]})}
                      style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                      <Plus size={16} /> Añadir otro teléfono
                    </button>
                  </div>
                ) : (
                  <Field label="Teléfono" error={errors.telefono}>
                    <Input value={f.telefono} onChange={e => setF(prev => ({...prev, telefono: e.target.value}))} placeholder="Ej: +54 9 11 1234-5678 o 1112345678" type="tel" maxLength={53} />
                  </Field>
                )}
                <Field label="Email">
                  <Input type="email" value={f.email} onChange={set('email')} placeholder="correo@ejemplo.com" />
                </Field>
                {rol === 'directivo' && (
                  <Field label="Email ABC">
                    <Input type="email" value={f.email_abc} onChange={set('email_abc')} placeholder="email@abc.gob.ar" />
                  </Field>
                )}
              </div>
            </div>

            {/* === ASIGNACIÓN (docente) === */}
            {rol === 'docente' && (
              <div className="agregar-alumno-section">
                <SectionTitle icon={<Shield size={20} />}>Cursos Asignados</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {cursos.map(c => {
                    const label = `${c.año}° ${c.division}`
                    const selected = f.cursos_asignados.some(value => Number(value) === c.id || String(value).replace(/\s/g,'') === `${c.año}°${c.division}`)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setF(prev => ({
                          ...prev,
                          cursos_asignados: selected
                            ? prev.cursos_asignados.filter(value => Number(value) !== c.id && String(value).replace(/\s/g,'') !== `${c.año}°${c.division}`)
                            : [...prev.cursos_asignados, c.id],
                        }))}
                        style={{
                          padding: '8px 16px', borderRadius: 20, border: `2px solid ${selected ? '#4a63e0' : '#e0e0e0'}`,
                          background: selected ? '#eef2ff' : '#fff',
                          color: selected ? '#4a63e0' : '#666',
                          fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          fontFamily: 'inherit', transition: 'all 0.2s',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* === MATERIAS ASIGNADAS (docente) === */}
            {rol === 'docente' && materias.length > 0 && (
              <div className="agregar-alumno-section">
                <SectionTitle icon={<Book size={20} />}>Materias Asignadas</SectionTitle>
                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Buscar materia..."
                    value={materiaSearchQuery}
                    onChange={(e) => setMateriaSearchQuery(e.target.value)}
                    className="sh-input"
                    style={{ flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: '200px', overflowY: 'auto', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                  {[...new Map(filteredMaterias.map(m => [m.nombre, m])).values()].map(m => {
                    const selected = f.materiasAsignadas.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setF(prev => ({
                          ...prev,
                          materiasAsignadas: selected
                            ? prev.materiasAsignadas.filter(id => id !== m.id)
                            : [...prev.materiasAsignadas, m.id],
                        }))}
                        style={{
                          padding: '6px 12px', borderRadius: 20, border: `2px solid ${selected ? '#7c3aed' : '#e0e0e0'}`,
                          background: selected ? '#f3e8ff' : '#fff',
                          color: selected ? '#7c3aed' : '#666',
                          fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          fontFamily: 'inherit', transition: 'all 0.2s',
                        }}
                      >
                        {m.nombre}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* === DATOS ACADÉMICOS (estudiante) === */}
            {rol === 'estudiante' && <Field label="Grupo"><Select value={f.grupo} onChange={set('grupo')} options={['A', 'B']} /></Field>}
          {rol === 'estudiante' && (
              <div className="agregar-alumno-section">
                <SectionTitle icon={<BookOpen size={20} />}>Datos Académicos</SectionTitle>
                <div className="agregar-alumno-grid">
                  <Field label="Curso (Selección única)" error={errors.año || errors.division}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, gridColumn: '1 / -1' }}>
                      {cursos.map(c => {
                        const label = `${c.año}° ${c.division}`
                        const selected = (f.año == c.año && f.division === c.division)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setF(prev => ({ ...prev, año: c.año, division: c.division }))
                              if (errors.año || errors.division) {
                                setErrors(prev => ({ ...prev, año: '', division: '' }))
                              }
                            }}
                            style={{
                              padding: '8px 16px', borderRadius: 20, border: `2px solid ${selected ? '#4a63e0' : '#e0e0e0'}`,
                              background: selected ? '#eef2ff' : '#fff',
                              color: selected ? '#4a63e0' : '#666',
                              fontWeight: 600, fontSize: 13, cursor: 'pointer',
                              fontFamily: 'inherit', transition: 'all 0.2s',
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                  <Field label="Observaciones">
                    <Textarea value={f.observaciones} onChange={set('observaciones')} placeholder="Notas adicionales..." />
                  </Field>
                </div>
              </div>
            )}

            {/* === DATOS FAMILIARES (familia) === */}
            {rol === 'familia' && (
              <div className="agregar-alumno-section">
                <SectionTitle icon={<Users size={20} />}>Menores a Cargo</SectionTitle>
                {errors.alumnos && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{errors.alumnos}</p>}
                <AutocompleteInput
                  placeholder="Buscar por DNI, nombre o apellido"
                  selectedItems={alumnosSeleccionados}
                  onSelect={(a) => setAlumnosSeleccionados(prev => prev.find(x => x.id === a.id) ? prev : [...prev, a])}
                  onRemove={(id) => setAlumnosSeleccionados(prev => prev.filter(x => x.id !== id))}
                />
                <div style={{ marginTop: 20 }}>
                  <Field label="Relación con el estudiante">
                    <Select value={f.relacion} onChange={set('relacion')} options={['Madre', 'Padre', 'Tutor/a', 'Abuelo/a', 'Hermano/a', 'Otro']} placeholder="Vínculo" />
                  </Field>
                </div>
                <Field label="Observaciones">
                  <Textarea value={f.observaciones} onChange={set('observaciones')} placeholder="Notas adicionales..." />
                </Field>
              </div>
            )}

            {/* === ASIGNACIÓN (preceptor) === */}
            {rol === 'preceptor' && (
              <div className="agregar-alumno-section">
                <SectionTitle icon={<Shield size={20} />}>Asignación</SectionTitle>
                <div className="agregar-alumno-grid">
                  <Field label="Turno(s)">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {['Mañana', 'Tarde', 'Vespertino'].map(t => {
                        const selected = f.turno.includes(t)
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setF(prev => ({
                              ...prev,
                              turno: selected ? prev.turno.filter(x => x !== t) : [...prev.turno, t],
                            }))}
                            style={{
                              padding: '8px 16px', borderRadius: 20, border: `2px solid ${selected ? '#d97706' : '#e0e0e0'}`,
                              background: selected ? '#fffbeb' : '#fff',
                              color: selected ? '#d97706' : '#666',
                              fontWeight: 600, fontSize: 13, cursor: 'pointer',
                              fontFamily: 'inherit', transition: 'all 0.2s',
                            }}
                          >
                            {t}
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                  <Field label="Cursos Asignados">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {cursos.map(c => {
                        const label = `${c.año}° ${c.division}`
                        const selected = f.cursos_asignados.some(value => Number(value) === c.id || String(value).replace(/\s/g,'') === `${c.año}°${c.division}`)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setF(prev => ({
                              ...prev,
                              cursos_asignados: selected
                                ? prev.cursos_asignados.filter(value => Number(value) !== c.id && String(value).replace(/\s/g,'') !== `${c.año}°${c.division}`)
                                : [...prev.cursos_asignados, c.id],
                            }))}
                            style={{
                              padding: '8px 16px', borderRadius: 20, border: `2px solid ${selected ? '#4a63e0' : '#e0e0e0'}`,
                              background: selected ? '#eef2ff' : '#fff',
                              color: selected ? '#4a63e0' : '#666',
                              fontWeight: 600, fontSize: 13, cursor: 'pointer',
                              fontFamily: 'inherit', transition: 'all 0.2s',
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {/* === DATOS LABORALES (directivo) === */}
            {rol === 'directivo' && (
              <>
                <div className="agregar-alumno-section">
                  <SectionTitle icon={<Briefcase size={20} />}>Datos Laborales</SectionTitle>
                  <div className="agregar-alumno-grid">
                    <Field label="Código ASI">
                      <Input value={f.codigo_asi} onChange={set('codigo_asi')} placeholder="Código ASI" />
                    </Field>
                    <Field label="Código ESP">
                      <Input value={f.codigo_esp} onChange={set('codigo_esp')} placeholder="Código ESP" />
                    </Field>
                    <Field label="Fecha de Ingreso">
                      <Input type="date" value={f.fecha_ingreso} onChange={set('fecha_ingreso')} />
                    </Field>
                    <Field label="Cargo">
                      <Input value={f.cargo} onChange={set('cargo')} placeholder="Cargo actual" />
                    </Field>
                    <Field label="Cargo al Ingresar">
                      <Input value={f.cargo_al_ingresar} onChange={set('cargo_al_ingresar')} placeholder="Cargo al momento de ingreso" />
                    </Field>
                    <Field label="Estado">
                      <Select value={f.estado} onChange={set('estado')} options={['Activo', 'Licencia', 'Suspendido', 'Inactivo']} placeholder="Seleccionar..." />
                    </Field>
                    <Field label="Tipo de Listado">
                      <Input value={f.tipo_listado} onChange={set('tipo_listado')} placeholder="Tipo de listado" />
                    </Field>
                    <Field label="Tipo de Listado al Ingresar">
                      <Input value={f.tipo_listado_al_ingresar} onChange={set('tipo_listado_al_ingresar')} placeholder="Tipo de listado al ingresar" />
                    </Field>
                    <Field label="Situación de Revista">
                      <Input value={f.situacion_revista} onChange={set('situacion_revista')} placeholder="Situación de revista" />
                    </Field>
                  </div>
                </div>

                <div className="agregar-alumno-section">
                  <SectionTitle icon={<FileText size={20} />}>Reemplazos y Licencias</SectionTitle>
                  <div className="agregar-alumno-grid">
                    <Field label="Reemplaza a">
                      <Input value={f.reemplaza_a} onChange={set('reemplaza_a')} placeholder="Nombre de la persona reemplazada" />
                    </Field>
                    <Field label="Tipo de Licencia">
                      <Input value={f.tipo_licencia} onChange={set('tipo_licencia')} placeholder="Tipo de licencia" />
                    </Field>
                    <Field label="Motivo de Licencia">
                      <Textarea value={f.motivo_licencia} onChange={set('motivo_licencia')} placeholder="Motivo..." />
                    </Field>
                    <Field label="Fecha Inicio Licencia">
                      <Input type="date" value={f.fecha_inicio_licencia} onChange={set('fecha_inicio_licencia')} />
                    </Field>
                    <Field label="Fecha Fin Licencia">
                      <Input type="date" value={f.fecha_fin_licencia} onChange={set('fecha_fin_licencia')} />
                    </Field>
                  </div>
                </div>

                <div className="agregar-alumno-section">
                  <SectionTitle icon={<Book size={20} />}>Títulos Habilitantes</SectionTitle>
                  <Field label="Títulos">
                    <Textarea value={f.titulos_habilitantes} onChange={set('titulos_habilitantes')} placeholder="Listado de títulos habilitantes..." />
                  </Field>
                </div>
              </>
            )}

            {/* === BOTONES === */}
            <div className="agregar-alumno-actions">
              <button type="submit" className="sh-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} disabled={submitting}>
                <Save size={18} />
                {submitting ? 'Guardando...' : (userToEdit ? 'Guardar Cambios' : 'Registrar Usuario')}
              </button>
              {!userToEdit && (
                <button type="button" className="sh-btn-secondary" onClick={() => setRol('')}>
                  Elegir otro rol
                </button>
              )}
            </div>
          </form>
        )}
      </div>
      
    </div>
  )
}
