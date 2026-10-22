import { apiFetch } from '../../api/http.js'
import { useState, useEffect, Fragment } from 'react';
import { X, Users, CheckCircle2, XCircle, Plus, Trash2, ChevronDown, ChevronRight, Eye, ArrowLeft } from 'lucide-react';
import { API_BASE } from '../../config'
import { getFranjas, getCiclo } from '../../utils/horarioUtils'
import HorarioGrid from '../../components/specific/HorarioGrid'
import '../../shared.css'
import './AdminDashboard.css'
import '../estudiante/EstudianteModule.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

function formatearFecha(fechaISO) {
  if (!fechaISO) return '-'
  const d = new Date(fechaISO)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '-'
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const mes = hoy.getMonth() - nac.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

export default function AdminCursos() {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [alumnos, setAlumnos] = useState([])
  const [orientaciones, setOrientaciones] = useState([])
  const [filters, setFilters] = useState({ anio: '', division: '', activo: '' })
  const [showCrear, setShowCrear] = useState(false)
  const [nuevoCurso, setNuevoCurso] = useState({ anio: '', division: '', orientacion: '', activo: true })
  const [expandedCursoId, setExpandedCursoId] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedCurso, setSelectedCurso] = useState(null)
  const [alumnosCurso, setAlumnosCurso] = useState([])
  const [horariosCurso, setHorariosCurso] = useState([])
  const [materiasCurso, setMateriasCurso] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() }).then(r => r.json()),
      apiFetch(`${API_BASE}/alumnos/`, { headers: authHeaders() }).then(r => r.json()),
      apiFetch(`${API_BASE}/orientaciones/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
    ])
      .then(([cursosData, alumnosData, orientacionesData]) => {
        setOrientaciones(Array.isArray(orientacionesData) ? orientacionesData : [])
        const mapped = cursosData.map(item => ({
          id: item.id,
          Anio: `${item.año}°`,
          Division: item.division,
          Carrera: item.orientacion_nombre || item.carrera || 'Ciclo Básico',
          orientacion_id: item.orientacion,
          Cantidad_Alumnos: alumnosData.filter(a => a.año === item.año && a.division === item.division).length,
          Activo: item.activo,
          raw: {
            id: item.id,
            nombre: `${item.año}° ${item.division}`,
            apellido: '',
            dni: '-',
            Carrera: item.orientacion_nombre || item.carrera || 'Ciclo Básico',
            Cantidad_Alumnos: alumnosData.filter(a => a.año === item.año && a.division === item.division).length,
            Activo: item.activo,
          }
        }))
        setCursos(mapped)
        setAlumnos(alumnosData)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'anio' ? { division: '' } : {})
    }))
  }

  const handleClear = () => {
    setFilters({ anio: '', division: '', activo: '' })
  }

  const handleNuevoCursoChange = (e) => {
    const { name, value } = e.target
    setNuevoCurso(prev => ({ ...prev, [name]: value }))
  }

  const crearCurso = () => {
    if (!nuevoCurso.anio || !nuevoCurso.division) return
    const body = {
      año: parseInt(nuevoCurso.anio, 10),
      division: nuevoCurso.division,
      activo: nuevoCurso.activo,
    }
    if (nuevoCurso.orientacion) body.orientacion = parseInt(nuevoCurso.orientacion, 10)
    apiFetch(`${API_BASE}/cursos/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
      .then(r => { if (!r.ok) throw new Error('Error al crear curso'); return r.json() })
      .then(item => {
        const ori = orientaciones.find(o => o.id === item.orientacion)
        const curso = {
          id: item.id,
          Anio: `${item.año}°`,
          Division: item.division,
          Carrera: ori ? ori.nombre : item.orientacion_nombre || 'Ciclo Básico',
          orientacion_id: item.orientacion,
          Cantidad_Alumnos: 0,
          Activo: item.activo,
        }
        setCursos(prev => [...prev, curso])
        setNuevoCurso({ anio: '', division: '', orientacion: '', activo: true })
        setShowCrear(false)
      })
      .catch(() => {})
  }

  const eliminarCurso = (id) => {
    apiFetch(`${API_BASE}/cursos/${id}/`, { method: 'DELETE', headers: authHeaders() })
      .then(r => { if (r.ok) setCursos(prev => prev.filter(c => c.id !== id)) })
      .catch(() => {})
  }

  const toggleActivo = async (id, nuevoValor) => {
    try {
      const r = await apiFetch(`${API_BASE}/cursos/${id}/`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoValor }),
      })
      if (!r.ok) throw new Error('Error al actualizar estado del curso')
      await r.json()
      setCursos(prev => prev.map(c => c.id === id ? { ...c, Activo: nuevoValor, raw: { ...c.raw, Activo: nuevoValor } } : c))
      if (selectedCurso && selectedCurso.id === id) {
        setSelectedCurso(prev => ({ ...prev, Activo: nuevoValor }))
      }
    } catch {
  alert('No se pudo cambiar el estado del curso');
}
  }

  const handleViewCurso = async (curso) => {
    setSelectedCurso(curso)
    setLoadingProfile(true)
    try {
      const anio = parseInt(curso.Anio)
      const division = curso.Division
      const [horariosData, materiasData] = await Promise.all([
        apiFetch(`${API_BASE}/horarios/`, { headers: authHeaders() }).then(r => r.json()),
        apiFetch(`${API_BASE}/materias/`, { headers: authHeaders() }).then(r => r.json()),
      ])
      setAlumnosCurso(alumnos.filter(a => a.año === anio && a.division === division))
      setHorariosCurso(horariosData.filter(h => h.curso === curso.id))
      setMateriasCurso(materiasData)
    } catch (err) {
      console.error('Error loading curso data', err)
    } finally {
      setLoadingProfile(false)
    }
  }

  const filtered = cursos.filter(c => {
    if (filters.anio && c.Anio !== `${filters.anio}°`) return false
    if (filters.division && c.Division !== filters.division) return false
    if (filters.activo && ((filters.activo === 'true' && !c.Activo) || (filters.activo === 'false' && c.Activo))) return false
    return true
  })

  const divisionOptions = () => {
    if (filters.anio === '' || ['1','2','3'].includes(filters.anio)) {
      return ['A','B','C','D','E']
    }
    return ['1ra','2da','3ra','4ta','5ta','6ta']
  }

  const aniosDisponibles = ['1','2','3','4','5','6','7']

  if (loading) {
    return (
      <div className="sh-page">
        <div className="sh-hero">
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Gestión de Cursos</h2>
            <p className="sh-hero-subtitle">Cargando cursos...</p>
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
            <h2 className="sh-hero-title">Gestión de Cursos</h2>
            <p className="sh-hero-subtitle" style={{ color: '#dc2626' }}>Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h2 className="sh-hero-title">Gestión de Cursos</h2>
            <p className="sh-hero-subtitle">{cursos.length} cursos registrados · Ciclo Lectivo 2026</p>
          </div>
          <button onClick={() => setShowCrear(!showCrear)} className="sh-btn-primary" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> {showCrear ? 'Cancelar' : 'Crear Curso'}
          </button>
        </div>
      </div>

      {showCrear && (
        <div className="sh-card" style={{ marginBottom: 24 }}>
          <h3 className="sh-card-title"><Plus size={18} /> Nuevo Curso</h3>
          <div className="sh-filters-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="sh-filter-group">
              <label className="sh-filter-label">Año</label>
              <select name="anio" value={nuevoCurso.anio} onChange={handleNuevoCursoChange} className="sh-select">
                <option value="">Seleccionar</option>
                {aniosDisponibles.map(a => <option key={a} value={a}>{a}°</option>)}
              </select>
            </div>
            <div className="sh-filter-group">
              <label className="sh-filter-label">División</label>
              <select name="division" value={nuevoCurso.division} onChange={handleNuevoCursoChange} className="sh-select">
                <option value="">Seleccionar</option>
                {['A','B','C','D','E','1ra','2da','3ra','4ta','5ta','6ta'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="sh-filter-group">
              <label className="sh-filter-label">Orientación</label>
              <select name="orientacion" value={nuevoCurso.orientacion} onChange={handleNuevoCursoChange} className="sh-select">
                <option value="">Sin orientación (Ciclo Básico)</option>
                {orientaciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
            <div className="sh-filter-group">
              <label className="sh-filter-label">Activo</label>
              <select name="activo" value={nuevoCurso.activo} onChange={(e) => setNuevoCurso(prev => ({ ...prev, activo: e.target.value === 'true' }))} className="sh-select">
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCrear(false)} className="sh-btn-ghost">Cancelar</button>
            <button onClick={crearCurso} className="sh-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} /> Crear Curso
            </button>
          </div>
        </div>
      )}

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Año</label>
            <select name="anio" value={filters.anio} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="1">1°</option>
              <option value="2">2°</option>
              <option value="3">3°</option>
              <option value="4">4°</option>
              <option value="5">5°</option>
              <option value="6">6°</option>
              <option value="7">7°</option>
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">División</label>
            <select name="division" value={filters.division} onChange={handleChange} className="sh-select">
              <option value="">Todas</option>
              {divisionOptions().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Activo</label>
            <select name="activo" value={filters.activo} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
        <div className="sh-filters-actions">
          <button className="sh-btn-ghost" onClick={handleClear}><X size={16} /> Limpiar filtros</button>
        </div>
      </div>

      {selectedCurso && !selectedStudent ? (
        <div className="sh-card">
          <button onClick={() => setSelectedCurso(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 }}>
            <ArrowLeft size={16} /> Volver a cursos
          </button>
          <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700 }}>
            {selectedCurso.Anio} {selectedCurso.Division} {selectedCurso.Carrera !== 'Ciclo Básico' ? `- ${selectedCurso.Carrera}` : ''}
          </h3>
          <div className="en-perfil-info-grid">
            <div className="en-perfil-field"><span className="en-perfil-label">Estado</span><span className="en-perfil-value">{selectedCurso.Activo ? 'Activo' : 'Inactivo'}</span></div>
            <div className="en-perfil-field"><span className="en-perfil-label">Alumnos</span><span className="en-perfil-value">{selectedCurso.Cantidad_Alumnos || 0}</span></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="sh-btn-primary" style={{ background: selectedCurso.Activo ? '#dc2626' : '#16a34a' }} onClick={() => toggleActivo(selectedCurso.id, !selectedCurso.Activo)}>
              {selectedCurso.Activo ? 'Desactivar Curso' : 'Activar Curso'}
            </button>
          </div>
          <h4 style={{ margin: '24px 0 12px', fontSize: 14, color: 'var(--text-main)', fontWeight: 700 }}>Horarios</h4>
          {(() => {
            const ciclo = getCiclo(`${selectedCurso.Anio}${selectedCurso.Division}`)
            const franjas = getFranjas(ciclo)
            const materiaMap = {}
            materiasCurso.forEach(m => { materiaMap[m.id] = m.nombre })
            const horariosGrid = horariosCurso.map(h => ({
              id: h.id,
              dia: h.dia,
              franja: h.franja,
              materia: materiaMap[h.materia] || `Materia #${h.materia}`,
              profesor: h.profesor_nombre || '-',
              aula: h.aula || '-',
            }))
            const materiaNames = [...new Set(horariosGrid.map(h => h.materia))]
            const colors = {}
            const palette = [
              { bg: '#dbeafe', color: '#1d4ed8' },
              { bg: '#fce7f3', color: '#be185d' },
              { bg: '#fef9c3', color: '#a16207' },
              { bg: '#dcfce7', color: '#15803d' },
              { bg: '#f3e8ff', color: '#7c3aed' },
              { bg: '#fef3c7', color: '#b45309' },
            ]
            materiaNames.forEach((nombre, i) => {
              const p = palette[i % palette.length]
              colors[nombre] = { bg: p.bg, color: p.color }
            })
            return horariosCurso.length > 0
              ? <HorarioGrid franjas={franjas} horarios={horariosGrid} materiaColors={colors} />
              : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No hay horarios registrados para este curso.</p>
          })()}
          <h4 style={{ margin: '24px 0 12px', fontSize: 14, color: 'var(--text-main)', fontWeight: 700 }}>Alumnos</h4>
          {loadingProfile ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando alumnos...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--gray-50)' }}><th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12 }}>Nombre</th><th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12 }}>DNI</th></tr></thead>
              <tbody>
                {alumnosCurso.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{a.apellido}, {a.nombre}</td>
                    <td style={{ padding: '8px 12px' }}>{a.dni}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : selectedStudent ? (
        <div className="sh-card">
          <button
            onClick={() => setSelectedStudent(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 }}
          >
            <ArrowLeft size={16} /> Volver a alumnos
          </button>
          <div className="en-perfil-avatar-section">
            <div className="en-perfil-avatar" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              {selectedStudent.nombre.charAt(0)}
            </div>
            <div>
              <h3 className="en-perfil-name">{selectedStudent.nombre} {selectedStudent.apellido}</h3>
              <p className="en-perfil-curso">Estudiante · DNI: {selectedStudent.dni}</p>
            </div>
          </div>
          <div className="en-perfil-info-grid" style={{ marginTop: 20 }}>
            <div className="en-perfil-field">
              <span className="en-perfil-field-label">Nombre completo</span>
              <span className="en-perfil-field-value">{selectedStudent.nombre} {selectedStudent.apellido}</span>
            </div>
            <div className="en-perfil-field">
              <span className="en-perfil-field-label">DNI</span>
              <span className="en-perfil-field-value">{selectedStudent.dni}</span>
            </div>
            <div className="en-perfil-field">
              <span className="en-perfil-field-label">Curso</span>
              <span className="en-perfil-field-value">{selectedStudent.curso}</span>
            </div>
            <div className="en-perfil-field">
              <span className="en-perfil-field-label">Edad</span>
              <span className="en-perfil-field-value">{calcularEdad(selectedStudent.fecha_nacimiento)} años</span>
            </div>
            <div className="en-perfil-field">
              <span className="en-perfil-field-label">Fecha de Nacimiento</span>
              <span className="en-perfil-field-value">{formatearFecha(selectedStudent.fecha_nacimiento)}</span>
            </div>
          </div>
        </div>
      ) : (
      <div className="sh-card">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', width: 40 }}></th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>AÑO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>DIVISIÓN</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>CARRERA</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>CANT. ALUMNOS</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ACTIVO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const isExpanded = expandedCursoId === c.id
              const alumnosCurso = alumnos.filter(a => a.año === parseInt(c.Anio) && a.division === c.Division)
              return (
                <Fragment key={c.id}>
                  <tr
                    onClick={() => setExpandedCursoId(isExpanded ? null : c.id)}
                    style={{ background: isExpanded ? 'rgba(74, 99, 224, 0.04)' : '#fff', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      {alumnosCurso.length > 0 ? (
                        isExpanded ? <ChevronDown size={16} style={{ color: 'var(--accent-blue)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                      ) : <span style={{ width: 16, display: 'inline-block' }} />}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-main)', fontWeight: 700 }}>{c.Anio}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        background: 'rgba(74, 99, 224, 0.1)',
                        color: '#4a63e0',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>{c.Division}</span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-soft)', fontWeight: 500 }}>{c.Carrera}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 600 }}>{c.Cantidad_Alumnos}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {c.Activo ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 12px', background: 'rgba(16, 185, 129, 0.1)',
                          color: '#059669', borderRadius: '12px', fontSize: '12px', fontWeight: 600
                        }}>
                          <CheckCircle2 size={14} /> Sí
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 12px', background: 'rgba(239, 68, 68, 0.1)',
                          color: '#dc2626', borderRadius: '12px', fontSize: '12px', fontWeight: 600
                        }}>
                          <XCircle size={14} /> No
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewCurso(c) }}
                          className="tooltip"
                          data-tooltip="Ver perfil del curso"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a63e0', display: 'flex', padding: 6, borderRadius: 6 }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); eliminarCurso(c.id) }}
                          className="tooltip"
                          data-tooltip="Eliminar curso"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', padding: 6, borderRadius: 6 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0, background: 'rgba(249, 250, 251, 0.8)' }}>
                        <div style={{ padding: '12px 20px 20px 60px' }}>
                          <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Users size={14} /> Alumnos del curso {c.Anio} "{c.Division}"
                          </h4>
                          {alumnosCurso.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, padding: 12 }}>No hay alumnos registrados en este curso.</p>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>Nombre</th>
                                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>DNI</th>
                                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>Acción</th>
                                </tr>
                              </thead>
                              <tbody>
                                {alumnosCurso.map(a => (
                                  <tr key={a.id}>
                                    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-main)', borderBottom: '1px solid var(--gray-100)' }}>{a.nombre} {a.apellido}</td>
                                    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-soft)', borderBottom: '1px solid var(--gray-100)' }}>{a.dni}</td>
                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--gray-100)' }}>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedStudent({ ...a, curso: `${c.Anio} "${c.Division}"` }) }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#4a63e0', fontSize: 12, fontWeight: 600, padding: 0 }}
                                      >
                                        <Eye size={14} /> Ver perfil
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

    </div>
  )
}
