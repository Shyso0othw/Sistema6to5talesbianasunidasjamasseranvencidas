import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { Search, X, Phone, Mail, Trash2, Pencil, Eye } from 'lucide-react'
import AgregarUsuario from '../../components/specific/AgregarUsuario'
import { API_BASE } from '../../config'
import '../../shared.css'
import './AdminDashboard.css'
import '../estudiante/EstudianteModule.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function AdminDocentes() {
  const [docentes, setDocentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ nombre: '', cargo: '', departamento: '', materia: '', curso: '' })

  const [editingDocente, setEditingDocente] = useState(null)
  const [selectedForProfile, setSelectedForProfile] = useState(null)
  const [materiasData, setMateriasData] = useState([])
  const [cursosData, setCursosData] = useState([])

  useEffect(() => {
    apiFetch(`${API_BASE}/docentes/`, { headers: authHeaders() })
      .then(r => { if (!r.ok) throw new Error('Error al cargar docentes'); return r.json() })
      .then(data => {
        const mapped = data.map(item => ({
          id: item.id,
          Nombre: item.nombre || '',
          Apellido: item.apellido || '',
          CUIL: item.cuil || '-',
          Cargo: item.cargo || '-',
          Materias: item.materias?.length ? item.materias.map(m => m.nombre || m).join(', ') : '-',
          Departamento: item.departamento || '-',
          Telefono: item.telefono || '-',
          Correo_abc: item.email || '-',
          raw: item,
        }))
        setDocentes(mapped)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
    
    apiFetch(`${API_BASE}/materias/`, { headers: authHeaders() }).then(r => r.json()).then(setMateriasData).catch(() => {})
    apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() }).then(r => r.json()).then(setCursosData).catch(() => {})
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleClear = () => {
    setFilters({ nombre: '', cargo: '', departamento: '', materia: '', curso: '' })
  }

  const eliminar = (id) => {
    apiFetch(`${API_BASE}/docentes/${id}/`, { method: 'DELETE', headers: authHeaders() })
      .then(r => { if (r.ok) setDocentes(prev => prev.filter(d => d.id !== id)) })
      .catch(() => {})
  }

  const filtered = docentes.filter(d => {
    if (filters.nombre && !`${d.Nombre} ${d.Apellido} ${d.CUIL}`.toLowerCase().includes(filters.nombre.toLowerCase())) return false
    if (filters.cargo && d.Cargo !== filters.cargo) return false
    if (filters.departamento && d.Departamento !== filters.departamento) return false
    if (filters.materia && d.Materias && !d.Materias.toLowerCase().includes(filters.materia.toLowerCase())) return false
    return true
  })

  if (editingDocente) {
    return (
      <div className="sh-page" style={{ padding: 0 }}>
        <AgregarUsuario
          defaultRol="docente"
          initialRole="docente"
          userToEdit={editingDocente}
          onCancel={() => setEditingDocente(null)}
          onEditSuccess={(updated) => {
            setDocentes(prev => prev.map(d => d.id === updated.id ? { ...d, raw: updated, Nombre: updated.nombre, Apellido: updated.apellido, CUIL: updated.cuil, Cargo: updated.cargo, Area: updated.materia, Departamento: updated.departamento, Telefono: updated.telefono, Correo_abc: updated.email } : d));
            setEditingDocente(null);
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
            <h2 className="sh-hero-title">Gestión de Docentes</h2>
            <p className="sh-hero-subtitle">Cargando docentes...</p>
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
            <h2 className="sh-hero-title">Gestión de Docentes</h2>
            <p className="sh-hero-subtitle" style={{ color: '#dc2626' }}>Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Gestión de Docentes</h2>
          <p className="sh-hero-subtitle">{docentes.length} docentes registrados · Ciclo Lectivo 2026</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Búsqueda</label>
            <div className="sh-input-group">
              <Search size={18} className="sh-input-icon" />
              <input type="text" name="nombre" value={filters.nombre} onChange={handleChange} placeholder="Nombre, apellido o CUIL..." className="sh-input sh-input-with-icon" />
            </div>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Cargo</label>
            <select name="cargo" value={filters.cargo} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="Profesor">Profesor</option>
              <option value="Jefe de área">Jefe de área</option>
              <option value="Jefe de departamento">Jefe de departamento</option>
              <option value="Director">Director</option>
              <option value="Vicedirector">Vicedirector</option>
              <option value="Jefe de preceptores">Jefe de preceptores</option>
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Departamento</label>
            <select name="departamento" value={filters.departamento} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="Exactas">Exactas</option>
              <option value="Sociales">Sociales</option>
              <option value="Comunicación">Comunicación</option>
              <option value="Deportes">Deportes</option>
              <option value="Preceptoría">Preceptoría</option>
              <option value="Ciencias Sociales">Ciencias Sociales</option>
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Materia</label>
            <select name="materia" value={filters.materia} onChange={handleChange} className="sh-select">
              <option value="">Todas</option>
              {materiasData.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Curso</label>
            <select name="curso" value={filters.curso} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              {cursosData.map(c => <option key={c.id} value={`${c.año}° ${c.division}`}>{c.año}° {c.division}</option>)}
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
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>NOMBRE</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>APELLIDO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>CUIL</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>CARGO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ÁREA</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>DEPARTAMENTO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>TELÉFONO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>EMAIL</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} style={{ background: '#fff', borderBottom: '1px solid var(--gray-100)' }}>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#059669', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>{d.Nombre}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>{d.Apellido}</td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-main)', fontFamily: 'monospace' }}>{d.CUIL}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    padding: '4px 10px', 
                    background: 'rgba(124, 58, 237, 0.1)', 
                    color: '#7c3aed', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600 
                  }}>{d.Cargo}</span>
                </td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-soft)', fontWeight: 500 }}>{d.Area}</td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-soft)', fontWeight: 500 }}>{d.Departamento}</td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>{d.Telefono}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>{d.Correo_abc}</span>
                   </div>
                 </td>
                 <td style={{ padding: '16px 20px' }}>
                   <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={(evt) => { evt.stopPropagation(); setEditingDocente(d.raw); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a63e0', display: 'flex', padding: 6, borderRadius: 6 }}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={(evt) => { evt.stopPropagation(); setSelectedForProfile(d); }} title="Ver perfil" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', padding: 4, borderRadius: 4 }}>
                        <Eye size={15} />
                      </button>
                      <button onClick={(evt) => { evt.stopPropagation(); eliminar(d.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', padding: 6, borderRadius: 6 }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
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
              <div className="en-perfil-field"><span className="en-perfil-label">DNI</span><span className="en-perfil-value">{selectedForProfile?.raw?.dni || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">CUIL</span><span className="en-perfil-value">{selectedForProfile?.CUIL || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Cargo</span><span className="en-perfil-value">{selectedForProfile?.Cargo || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Departamento</span><span className="en-perfil-value">{selectedForProfile?.Departamento || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Materias</span><span className="en-perfil-value">{selectedForProfile?.Materias || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Teléfono</span><span className="en-perfil-value">{selectedForProfile?.Telefono || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Email</span><span className="en-perfil-value">{selectedForProfile?.Correo_abc || '—'}</span></div>
              <div className="en-perfil-field" style={{ gridColumn: '1 / -1' }}><span className="en-perfil-label">Dirección</span><span className="en-perfil-value">{selectedForProfile?.raw?.calle || '—'} {selectedForProfile?.raw?.numero_calle || ''} {selectedForProfile?.raw?.localidad || ''}{selectedForProfile?.raw?.municipio ? `, ${selectedForProfile.raw.municipio}` : ''}</span></div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
