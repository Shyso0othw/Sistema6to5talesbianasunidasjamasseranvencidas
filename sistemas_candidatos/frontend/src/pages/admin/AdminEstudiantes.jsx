import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { Search, X, Phone, Trash2, Printer, Pencil, Eye } from 'lucide-react'
import AgregarUsuario from '../../components/specific/AgregarUsuario'
import { API_BASE } from '../../config'
import '../../shared.css'
import './AdminDashboard.css'
import '../estudiante/EstudianteModule.css'
import '../../components/Namecard.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function AdminEstudiantes() {
  const [estudiantes, setEstudiantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ nombre: '', curso: '', division: '', grupo: '', turno: '', ciclo: '' })
  const [, setSelectedEstudiante] = useState(null);
  const [editingEstudiante, setEditingEstudiante] = useState(null)
  const [selectedForProfile, setSelectedForProfile] = useState(null)

  useEffect(() => {
    apiFetch(`${API_BASE}/alumnos/`, { headers: authHeaders() })
      .then(r => { if (!r.ok) throw new Error('Error al cargar estudiantes'); return r.json() })
      .then(data => {
        const mapped = data.map(item => ({
          id: item.id,
          Nombre: item.nombre || '',
          Apellido: item.apellido || '',
          DNI: item.dni || '',
          Curso: item.año && item.division ? `${item.año}°${item.division}` : '-',
          Año: item.año || 0,
          Turno: '-',
          Grupo: item.grupo || '-',
          Division: item.division || '',
          Numero_Legajo: item.id?.toString() || '-',
          Telefono: item.telefonos_tutores?.[0]?.numero || '-',
          raw: item,
        }))
        setEstudiantes(mapped)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleClear = () => {
    setFilters({ nombre: '', curso: '', division: '', grupo: '', turno: '', ciclo: '' })
  }

  const eliminar = (id) => {
    apiFetch(`${API_BASE}/alumnos/${id}/`, { method: 'DELETE', headers: authHeaders() })
      .then(r => { if (r.ok) setEstudiantes(prev => prev.filter(e => e.id !== id)) })
      .catch(() => {})
  }

  const filtered = estudiantes.filter(e => {
    if (filters.nombre && !`${e.Nombre} ${e.Apellido} ${e.DNI}`.toLowerCase().includes(filters.nombre.toLowerCase())) return false
    if (filters.curso && !e.Curso.startsWith(filters.curso)) return false
    if (filters.division && e.Division !== filters.division) return false
    if (filters.grupo && e.Grupo !== filters.grupo) return false
    if (filters.turno && e.Turno.toLowerCase() !== filters.turno) return false
    if (filters.ciclo === 'basico' && (e.Año > 3 || e.Año === 0)) return false
    if (filters.ciclo === 'superior' && e.Año <= 3) return false
    return true
  })

  const handlePrintPDF = () => {
    const content = document.getElementById('export-container')
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Estudiantes</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; font-size: 14px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #e0e0e0; font-weight: 700; }
        @media print { body { margin: 0; padding: 20px; } }
      </style></head><body>${content.innerHTML}</body></html>
    `)
    win.document.close()
    win.print()
  }

  if (editingEstudiante) {
    return (
      <div className="sh-page" style={{ padding: 0 }}>
        <AgregarUsuario
          defaultRol="estudiante"
          userToEdit={editingEstudiante}
          onCancel={() => setEditingEstudiante(null)}
          onEditSuccess={(updated) => {
            setEstudiantes(prev => prev.map(e => e.id === updated.id ? { ...e, raw: updated, Nombre: updated.nombre, Apellido: updated.apellido, DNI: updated.dni, Curso: updated.año && updated.division ? `${updated.año}°${updated.division}` : '-', Año: updated.año || 0, Telefono: updated.telefonos_tutores?.[0]?.numero || '-' } : e));
            setEditingEstudiante(null);
          }}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="sh-page">
        <div className="sh-hero">
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Gestión de Estudiantes</h2>
            <p className="sh-hero-subtitle">Cargando estudiantes...</p>
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
            <h2 className="sh-hero-title">Gestión de Estudiantes</h2>
            <p className="sh-hero-subtitle" style={{ color: '#dc2626' }}>Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sh-page">
      <style>{`@media print { .print-only { display: block !important; } }`}</style>
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Gestión de Estudiantes</h2>
          <p className="sh-hero-subtitle">{estudiantes.length} estudiantes registrados · Ciclo Lectivo 2026</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Búsqueda</label>
            <div className="sh-input-group">
              <Search size={18} className="sh-input-icon" />
              <input type="text" name="nombre" value={filters.nombre} onChange={handleChange} placeholder="Nombre, apellido o DNI..." className="sh-input sh-input-with-icon" />
            </div>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Curso</label>
            <select name="curso" value={filters.curso} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="1">1°</option>
              <option value="2">2°</option>
              <option value="3">3°</option>
              <option value="4">4°</option>
              <option value="5">5°</option>
              <option value="6">6°</option><option value="7">7°</option>
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">División</label>
            <select name="division" value={filters.division} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
              <option value="1ra">1ra</option>
              <option value="2da">2da</option>
              <option value="3ra">3ra</option>
              <option value="4ta">4ta</option>
              <option value="5ta">5ta</option>
              <option value="6ta">6ta</option>
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Grupo</label>
            <select name="grupo" value={filters.grupo} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Ciclo</label>
            <select name="ciclo" value={filters.ciclo} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="basico">Básico</option>
              <option value="superior">Superior</option>
            </select>
          </div>
        </div>
        <div className="sh-filters-actions" style={{ display: 'flex', gap: '10px' }}>
          <button className="sh-btn-ghost" onClick={handlePrintPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={16} /> Exportar PDF
          </button>
          <button className="sh-btn-ghost" onClick={handleClear}><X size={16} /> Limpiar filtros</button>
        </div>
      </div>

      <div className="sh-card">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>NOMBRE</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>APELLIDO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>DNI</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>CURSO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>TURNO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>GRUPO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>LEGAJO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>TELÉFONO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} onClick={() => setSelectedEstudiante(e.raw)} style={{ background: '#fff', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }} className="sh-tr-hover">
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#4a63e0', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>{e.Nombre}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>{e.Apellido}</td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-main)', fontFamily: 'monospace' }}>{e.DNI}</td>
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
                  }}>{e.Curso}</span>
                </td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-soft)', fontWeight: 500 }}>{e.Turno}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    padding: '4px 10px', 
                    background: 'rgba(5, 150, 105, 0.1)', 
                    color: '#059669', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600 
                  }}>{e.Grupo}</span>
                </td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-muted)' }}>{e.Numero_Legajo}</td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>{e.Telefono}</span>
                   </div>
                 </td>
                 <td style={{ padding: '16px 20px' }}>
                   <div style={{ display: 'flex', gap: 6 }}>
                      <button aria-label="Editar estudiante" onClick={(evt) => { evt.stopPropagation(); setEditingEstudiante(e.raw); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a63e0', display: 'flex', padding: 6, borderRadius: 6 }}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={(evt) => { evt.stopPropagation(); setSelectedForProfile(e); }} title="Ver perfil" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', padding: 4, borderRadius: 4 }}>
                        <Eye size={15} />
                      </button>
                      <button aria-label="Eliminar estudiante" onClick={(evt) => { evt.stopPropagation(); eliminar(e.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', padding: 6, borderRadius: 6 }}>
                        <Trash2 size={16} />
                      </button>
                   </div>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Print area — hidden on screen */}
      <div className="print-only" style={{ display: 'none' }}>
        <div id="export-container">
          <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Listado de Estudiantes</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#e0e0e0' }}>
                <th style={{ border: '1px solid #333', padding: 8, textAlign: 'left' }}>Nombre</th>
                <th style={{ border: '1px solid #333', padding: 8, textAlign: 'left' }}>Apellido</th>
                <th style={{ border: '1px solid #333', padding: 8, textAlign: 'left' }}>DNI</th>
                <th style={{ border: '1px solid #333', padding: 8, textAlign: 'left' }}>Curso</th>
                <th style={{ border: '1px solid #333', padding: 8, textAlign: 'left' }}>Turno</th>
                <th style={{ border: '1px solid #333', padding: 8, textAlign: 'left' }}>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #333', padding: 8 }}>{item.Nombre}</td>
                  <td style={{ border: '1px solid #333', padding: 8 }}>{item.Apellido}</td>
                  <td style={{ border: '1px solid #333', padding: 8 }}>{item.DNI}</td>
                  <td style={{ border: '1px solid #333', padding: 8 }}>{item.Curso}</td>
                  <td style={{ border: '1px solid #333', padding: 8 }}>{item.Turno}</td>
                  <td style={{ border: '1px solid #333', padding: 8 }}>{item.Telefono}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedForProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setSelectedForProfile(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 500, width: '90%', maxHeight: '90vh', overflow: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedForProfile(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 20 }}>✕</button>
            <div className="en-perfil-avatar-section">
              <div className="en-perfil-avatar" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                {selectedForProfile?.Nombre?.charAt(0) || '?'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedForProfile?.Nombre || '—'} {selectedForProfile?.Apellido || '—'}</h3>
              </div>
            </div>
            <div className="en-perfil-info-grid">
              <div className="en-perfil-field"><span className="en-perfil-label">DNI</span><span className="en-perfil-value">{selectedForProfile?.DNI || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">CUIL</span><span className="en-perfil-value">{selectedForProfile?.raw?.cuil || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Fecha de Nacimiento</span><span className="en-perfil-value">{selectedForProfile?.raw?.fecha_nacimiento || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Edad</span><span className="en-perfil-value">{selectedForProfile?.raw?.fecha_nacimiento ? `${new Date().getFullYear() - new Date(selectedForProfile.raw.fecha_nacimiento).getFullYear()} años` : '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Lugar de Nacimiento</span><span className="en-perfil-value">{selectedForProfile?.raw?.lugar_nacimiento || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Nacionalidad</span><span className="en-perfil-value">{selectedForProfile?.raw?.nacionalidad || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Sexo</span><span className="en-perfil-value">{selectedForProfile?.raw?.sexo || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Identidad de Género</span><span className="en-perfil-value">{selectedForProfile?.raw?.identidad_genero || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Curso</span><span className="en-perfil-value">{selectedForProfile?.Curso || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Turno</span><span className="en-perfil-value">{selectedForProfile?.Turno || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Grupo</span><span className="en-perfil-value">{selectedForProfile?.Grupo || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Teléfono</span><span className="en-perfil-value">{selectedForProfile?.Telefono || '—'}</span></div>
              <div className="en-perfil-field" style={{ gridColumn: '1 / -1' }}><span className="en-perfil-label">Dirección</span><span className="en-perfil-value">{selectedForProfile?.raw?.calle || '—'} {selectedForProfile?.raw?.numero_calle || ''} {selectedForProfile?.raw?.localidad || ''}{selectedForProfile?.raw?.municipio ? `, ${selectedForProfile.raw.municipio}` : ''}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Alergias</span><span className="en-perfil-value">{selectedForProfile?.raw?.alergias || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Observaciones</span><span className="en-perfil-value">{selectedForProfile?.raw?.observaciones || '—'}</span></div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
