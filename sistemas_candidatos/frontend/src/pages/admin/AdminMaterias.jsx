import { apiFetch } from '../../api/http.js'
import { useState, useRef, useEffect, Fragment } from 'react';
import { Search, X, User, Clock, Plus, Pencil, Trash2, Check } from 'lucide-react'
import { API_BASE } from '../../config'
import '../../shared.css'
import './AdminDashboard.css'
import '../estudiante/EstudianteModule.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function AdminMaterias() {
  const [materias, setMaterias] = useState([])
  const [cursosMap, setCursosMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ nombre: '', carrera: '' })
  const [showCrear, setShowCrear] = useState(false)
  const [nuevaMateria, setNuevaMateria] = useState({ nombre: '', carrera: 'Ciclo Básico', id_curso: '', id_profesor: '', horas: '' })
  const [editandoId, setEditandoId] = useState(null)
  const [editData, setEditData] = useState({ nombre: '', horas: '', id_curso: '' })
  const [expandedMateriaName, setExpandedMateriaName] = useState(null)

  const [materiaSearch, setMateriaSearch] = useState('')
  const [materiaDropdownOpen, setMateriaDropdownOpen] = useState(false)
  const materiaRef = useRef(null)
  const [profesorSearch, setProfesorSearch] = useState('')
  const [profesorDropdownOpen, setProfesorDropdownOpen] = useState(false)
  const profesorRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (materiaRef.current && !materiaRef.current.contains(e.target)) {
        setMateriaDropdownOpen(false)
      }
      if (profesorRef.current && !profesorRef.current.contains(e.target)) {
        setProfesorDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_BASE}/materias/`, { headers: authHeaders() }).then(r => r.json()),
      apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() }).then(r => r.json()),
    ])
      .then(([materiasData, cursosData]) => {
        const cmap = {}
        cursosData.forEach(c => { cmap[c.id] = c })
        setCursosMap(cmap)

        const mapped = materiasData.map(item => {
          const curso = cmap[item.curso] || null
          return {
            id: item.id,
            Nombre: item.nombre || '',
            Carrera: curso?.carrera || 'Ciclo Básico',
            Id_Curso: curso ? `${curso.año}° ${curso.division}` : '-',
            cursoId: item.curso,
            Id_Profesor: '-',
            Horas: item.horas ?? 0,
          }
        })
        setMaterias(mapped)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleClear = () => {
    setFilters({ nombre: '', carrera: '' })
  }

  const handleNuevaMateriaChange = (e) => {
    const { name, value } = e.target
    setNuevaMateria(prev => ({ ...prev, [name]: value }))
  }

  const crearMateria = () => {
    if (!nuevaMateria.nombre || !nuevaMateria.horas) return
    const body = {
      nombre: nuevaMateria.nombre,
      horas: parseInt(nuevaMateria.horas, 10),
    }
    if (nuevaMateria.id_curso) body.curso = parseInt(nuevaMateria.id_curso, 10)
    apiFetch(`${API_BASE}/materias/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
      .then(r => { if (!r.ok) throw new Error('Error al crear materia'); return r.json() })
      .then(item => {
        const curso = cursosMap[item.curso] || null
        const materia = {
          id: item.id,
          Nombre: item.nombre || '',
          Carrera: curso?.carrera || 'Ciclo Básico',
          Id_Curso: curso ? `${curso.año}° ${curso.division}` : '-',
          Id_Profesor: '-',
          Horas: item.horas ?? 0,
        }
        setMaterias(prev => [...prev, materia])
        setNuevaMateria({ nombre: '', carrera: 'Ciclo Básico', id_curso: '', id_profesor: '', horas: '' })
        setShowCrear(false)
      })
      .catch(() => {})
  }

  const eliminarMateria = (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta materia?')) return
    apiFetch(`${API_BASE}/materias/${id}/`, { method: 'DELETE', headers: authHeaders() })
      .then(r => {
        if (r.ok) setMaterias(prev => prev.filter(m => m.id !== id))
      })
      .catch(() => {})
  }

  const iniciarEdicion = (m) => {
    setEditandoId(m.id)
    setEditData({ nombre: m.Nombre, horas: String(m.Horas), id_curso: m.cursoId || '' })
  }

  const guardarEdicion = (id) => {
    const body = {
      nombre: editData.nombre,
      horas: parseInt(editData.horas, 10) || 0,
    }
    if (editData.id_curso) body.curso = parseInt(editData.id_curso, 10)
    apiFetch(`${API_BASE}/materias/${id}/`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
      .then(r => { if (!r.ok) throw new Error('Error'); return r.json() })
      .then(item => {
        const curso = cursosMap[item.curso] || null
        setMaterias(prev => prev.map(m => m.id === id ? {
          ...m,
          Nombre: item.nombre,
          Horas: item.horas ?? 0,
          Carrera: curso?.carrera || 'Ciclo Básico',
          Id_Curso: curso ? `${curso.año}° ${curso.division}` : '-',
          cursoId: item.curso,
        } : m))
        setEditandoId(null)
      })
      .catch(() => {})
  }

  const nombresMaterias = [...new Set(materias.map(m => m.Nombre || ''))]
  const filteredMaterias = nombresMaterias.filter(n => n.toLowerCase().includes((materiaSearch || '').toLowerCase()))
  const nombresProfesores = [...new Set(materias.map(m => m.Id_Profesor || ''))]
  const filteredProfesores = nombresProfesores.filter(p => p.toLowerCase().includes((profesorSearch || '').toLowerCase()))

  const carreras = ['Ciclo Básico', 'Maestro Mayor de Obras', 'Informática', 'Programación', 'Electrónica', 'Mecánica', 'Electromecánica']
  const cursos = Object.values(cursosMap).map(c => ({ id: c.id, label: `${c.año}° ${c.division}` }))

  const filtered = materias.filter(m => {
    if (filters.nombre && !(m.Nombre || '').toLowerCase().includes(filters.nombre.toLowerCase())) return false
    if (filters.carrera && m.Carrera !== filters.carrera && m.Carrera !== 'Todas') return false
    return true
  })

  const materiasAgrupadas = filtered.reduce((acc, curr) => {
    const nombre = curr.Nombre || 'Sin nombre'
    if (!acc[nombre]) acc[nombre] = { name: nombre, items: [] }
    acc[nombre].items.push(curr)
    return acc
  }, {})
  
  const groupedList = Object.values(materiasAgrupadas).sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  if (loading) {
    return (
      <div className="sh-page">
        <div className="sh-hero">
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Gestión de Materias</h2>
            <p className="sh-hero-subtitle">Cargando materias...</p>
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
            <h2 className="sh-hero-title">Gestión de Materias</h2>
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
            <h2 className="sh-hero-title">Gestión de Materias</h2>
            <p className="sh-hero-subtitle">{materias.length} materias registradas · Ciclo Lectivo 2026</p>
          </div>
          <button onClick={() => setShowCrear(!showCrear)} className="sh-btn-primary" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> {showCrear ? 'Cancelar' : 'Crear Materia'}
          </button>
        </div>
      </div>

      {showCrear && (
        <div className="sh-card" style={{ marginBottom: 24 }}>
          <h3 className="sh-card-title"><Plus size={18} /> Nueva Materia</h3>
          <div className="sh-filters-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="sh-filter-group" ref={materiaRef} style={{ position: 'relative' }}>
              <label className="sh-filter-label">Nombre</label>
              <div className="sh-input-group">
                <Search size={18} className="sh-input-icon" />
                <input
                  type="text"
                  value={materiaSearch}
                  onChange={(e) => { setMateriaSearch(e.target.value); setMateriaDropdownOpen(true) }}
                  onFocus={() => setMateriaDropdownOpen(true)}
                  className="sh-input sh-input-with-icon"
                  placeholder="Buscar materia existente..."
                />
              </div>
              {materiaDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                  maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: 4
                }}>
                  {filteredMaterias.length === 0 ? (
                    <div style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 13 }}>Sin resultados</div>
                  ) : (
                    filteredMaterias.map(name => (
                      <div
                        key={name}
                        onClick={() => {
                          setNuevaMateria(prev => ({ ...prev, nombre: name }))
                          setMateriaSearch(name)
                          setMateriaDropdownOpen(false)
                        }}
                        style={{
                          padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: '#374151',
                          borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="sh-filter-group">
              <label className="sh-filter-label">Carrera</label>
              <select name="carrera" value={nuevaMateria.carrera} onChange={handleNuevaMateriaChange} className="sh-select">
                {carreras.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sh-filter-group">
              <label className="sh-filter-label">Curso</label>
              <select name="id_curso" value={nuevaMateria.id_curso} onChange={handleNuevaMateriaChange} className="sh-select">
                <option value="">Seleccionar</option>
                {cursos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="sh-filter-group" ref={profesorRef} style={{ position: 'relative' }}>
              <label className="sh-filter-label">Profesor</label>
              <div className="sh-input-group">
                <Search size={18} className="sh-input-icon" />
                <input
                  type="text"
                  value={profesorSearch}
                  onChange={(e) => { setProfesorSearch(e.target.value); setProfesorDropdownOpen(true) }}
                  onFocus={() => setProfesorDropdownOpen(true)}
                  className="sh-input sh-input-with-icon"
                  placeholder="Buscar profesor..."
                />
              </div>
              {profesorDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                  maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: 4
                }}>
                  {filteredProfesores.length === 0 ? (
                    <div style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 13 }}>Sin resultados</div>
                  ) : (
                    filteredProfesores.map(name => (
                      <div
                        key={name}
                        onClick={() => {
                          setNuevaMateria(prev => ({ ...prev, id_profesor: name }))
                          setProfesorSearch(name)
                          setProfesorDropdownOpen(false)
                        }}
                        style={{
                          padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: '#374151',
                          borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="sh-filter-group">
              <label className="sh-filter-label">Horas semanales</label>
              <input type="number" name="horas" value={nuevaMateria.horas} onChange={handleNuevaMateriaChange} className="sh-input" placeholder="Ej: 6" min="1" max="20" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCrear(false)} className="sh-btn-ghost">Cancelar</button>
            <button onClick={crearMateria} className="sh-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} /> Crear Materia
            </button>
          </div>
        </div>
      )}

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Búsqueda</label>
            <div className="sh-input-group">
              <Search size={18} className="sh-input-icon" />
              <input type="text" name="nombre" value={filters.nombre} onChange={handleChange} placeholder="Nombre de materia..." className="sh-input sh-input-with-icon" />
            </div>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Carrera</label>
            <select name="carrera" value={filters.carrera} onChange={handleChange} className="sh-select">
              <option value="">Todas</option>
              <option value="Ciclo Básico">Ciclo Básico</option>
              <option value="Maestro Mayor de Obras">Maestro Mayor de Obras</option>
              <option value="Informática">Informática</option>
              <option value="Programación">Programación</option>
              <option value="Electrónica">Electrónica</option>
              <option value="Mecánica">Mecánica</option>
              <option value="Electromecánica">Electromecánica</option>
            </select>
          </div>
        </div>
        <div className="sh-filters-actions">
          <button className="sh-btn-ghost" onClick={handleClear}><X size={16} /> Limpiar filtros</button>
        </div>
      </div>

      <div className="sh-card">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', width: 40 }}></th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>MATERIA</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>CURSOS ASIGNADOS</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>HORAS TOTALES</th>
            </tr>
          </thead>
          <tbody>
            {groupedList.map(group => {
              const isExpanded = expandedMateriaName === group.name
              const totalHoras = group.items.reduce((sum, item) => sum + item.Horas, 0)
              
              return (
                <Fragment key={group.name}>
                  <tr 
                    onClick={() => setExpandedMateriaName(isExpanded ? null : group.name)} 
                    style={{ background: isExpanded ? 'rgba(139, 92, 246, 0.04)' : '#fff', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
                    className="sh-tr-hover"
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '12px', height: '12px', background: '#8b5cf6', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 700 }}>{group.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', padding: '4px 10px', 
                        background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '12px', fontSize: '12px', fontWeight: 600 
                      }}>{group.items.length} curso(s)</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 700 }}>{totalHoras}</span>
                        <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>h/sem</span>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={4} style={{ padding: 0, background: 'rgba(249, 250, 251, 0.8)' }}>
                        <div style={{ padding: '12px 20px 20px 60px' }}>
                          <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Asignaciones de la Materia
                          </h4>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>CURSO</th>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>CARRERA</th>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>PROFESOR</th>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>HORAS</th>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--gray-200)' }}>ACCIONES</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map(m => (
                                <tr key={m.id}>
                                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--gray-100)' }}>
                                    {editandoId === m.id ? (
                                      <select value={editData.id_curso} onChange={e => setEditData(prev => ({ ...prev, id_curso: e.target.value }))} className="sh-select" style={{ padding: '6px 10px', fontSize: 13 }}>
                                        <option value="">Sin curso</option>
                                        {cursos.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                      </select>
                                    ) : (
                                      <span style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>{m.Id_Curso}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-soft)', borderBottom: '1px solid var(--gray-100)' }}>{m.Carrera}</td>
                                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--gray-100)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <User size={14} style={{ color: 'var(--text-muted)' }} />
                                      <span style={{ fontSize: '13px', color: 'var(--text-soft)' }}>{m.Id_Profesor}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--gray-100)' }}>
                                    {editandoId === m.id ? (
                                      <input type="number" value={editData.horas} onChange={e => setEditData(prev => ({ ...prev, horas: e.target.value }))} className="sh-input" style={{ padding: '6px 10px', fontSize: 13, width: 60 }} min="1" max="20" />
                                    ) : (
                                      <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 700 }}>{m.Horas} <span style={{ color: 'var(--text-soft)', fontWeight: 400 }}>h/sem</span></span>
                                    )}
                                  </td>
                                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--gray-100)' }}>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      {editandoId === m.id ? (
                                        <>
                                          <button onClick={() => guardarEdicion(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', padding: 4, borderRadius: 6 }} title="Guardar">
                                            <Check size={16} />
                                          </button>
                                          <button onClick={() => setEditandoId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, borderRadius: 6 }} title="Cancelar">
                                            <X size={16} />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button onClick={() => iniciarEdicion(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a63e0', padding: 4, borderRadius: 6 }} title="Editar">
                                            <Pencil size={16} />
                                          </button>
                                          <button onClick={() => eliminarMateria(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4, borderRadius: 6 }} title="Eliminar">
                                            <Trash2 size={16} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
    </div>
  )
}
