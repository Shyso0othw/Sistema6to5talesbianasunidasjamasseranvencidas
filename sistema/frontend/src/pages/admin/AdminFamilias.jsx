import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { Search, X, Phone, Mail, Briefcase, Trash2, Pencil, Eye } from 'lucide-react'
import AgregarUsuario from '../../components/specific/AgregarUsuario'
import { API_BASE } from '../../config'
import '../../shared.css'
import './AdminDashboard.css'
import '../estudiante/EstudianteModule.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function AdminFamilias() {
  const [familias, setFamilias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ nombre: '', ocupacion: '', curso: '' })
  const [, setSelectedFamilia] = useState(null);
  const [editingFamilia, setEditingFamilia] = useState(null)
  const [selectedForProfile, setSelectedForProfile] = useState(null)

  useEffect(() => {
    apiFetch(`${API_BASE}/familias/`, { headers: authHeaders() })
      .then(r => { if (!r.ok) throw new Error('Error al cargar familias'); return r.json() })
      .then(data => {
        const mapped = data.map(item => ({
          id: item.id,
          Nombre: item.nombre || '',
          Apellido: item.apellido || '',
          DNI: item.dni || '-',
          Ocupacion: item.ocupacion || '-',
          Telefono: item.telefono || '-',
          Correo_Electronico: item.email || '-',
          Hijos: item.alumnos ? item.alumnos.map(a => `${a.nombre} ${a.apellido}`).join(', ') || '-' : '-',
          raw: item,
        }))
        setFamilias(mapped)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleClear = () => {
    setFilters({ nombre: '', ocupacion: '', curso: '' })
  }

  const eliminar = (id) => {
    apiFetch(`${API_BASE}/familias/${id}/`, { method: 'DELETE', headers: authHeaders() })
      .then(r => { if (r.ok) setFamilias(prev => prev.filter(f => f.id !== id)) })
      .catch(() => {})
  }

  const filtered = familias.filter(f => {
    if (filters.nombre && !`${f.Nombre} ${f.Apellido} ${f.DNI}`.toLowerCase().includes(filters.nombre.toLowerCase())) return false
    if (filters.ocupacion && !f.Ocupacion.toLowerCase().includes(filters.ocupacion.toLowerCase())) return false
    return true
  })

  if (editingFamilia) {
    return (
      <div className="sh-page" style={{ padding: 0 }}>
        <AgregarUsuario
          defaultRol="familia"
          initialRole="familia"
          userToEdit={editingFamilia}
          onCancel={() => setEditingFamilia(null)}
          onEditSuccess={(updated) => {
            setFamilias(prev => prev.map(f => f.id === updated.id ? { ...f, raw: updated, Nombre: updated.nombre, Apellido: updated.apellido, DNI: updated.dni || '-', Ocupacion: updated.ocupacion || '-', Telefono: updated.telefono || '-', Correo_Electronico: updated.email || '-', Hijos: updated.alumnos ? updated.alumnos.map(a => `${a.nombre} ${a.apellido}`).join(', ') || '-' : '-' } : f));
            setEditingFamilia(null);
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
            <h2 className="sh-hero-title">Gestión de Familias/Tutores</h2>
            <p className="sh-hero-subtitle">Cargando tutores...</p>
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
            <h2 className="sh-hero-title">Gestión de Familias/Tutores</h2>
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
          <h2 className="sh-hero-title">Gestión de Familias/Tutores</h2>
          <p className="sh-hero-subtitle">{familias.length} tutores registrados · Ciclo Lectivo 2026</p>
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
            <label className="sh-filter-label">Ocupación</label>
            <select name="ocupacion" value={filters.ocupacion} onChange={handleChange} className="sh-select">
              <option value="">Todas</option>
              <option value="Docente">Docente</option>
              <option value="Comerciante">Comerciante</option>
              <option value="Enfermera">Enfermera</option>
              <option value="Ingeniero">Ingeniero</option>
              <option value="Abogada">Abogada</option>
              <option value="Arquitecto">Arquitecto</option>
              <option value="Ama de casa">Ama de casa</option>
              <option value="Médico">Médico</option>
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Curso/División</label>
            <select name="curso" value={filters.curso} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="1">1°</option>
              <option value="2">2°</option>
              <option value="3">3°</option>
              <option value="4">4°</option>
              <option value="5">5°</option>
              <option value="6">6°</option>
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
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>DNI</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>OCUPACIÓN</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>TELÉFONO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>EMAIL</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ESTUDIANTE/S</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} onClick={() => setSelectedFamilia(f.raw)} style={{ background: '#fff', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }} className="sh-tr-hover">
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>{f.Nombre}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>{f.Apellido}</td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-main)', fontFamily: 'monospace' }}>{f.DNI}</td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>{f.Ocupacion}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>{f.Telefono}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>{f.Correo_Electronico}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    padding: '4px 10px', 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    color: '#d97706', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600 
                  }}>{f.Hijos}</span>
                 </td>
                 <td style={{ padding: '16px 20px' }}>
                   <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={(evt) => { evt.stopPropagation(); setEditingFamilia(f.raw); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a63e0', display: 'flex', padding: 6, borderRadius: 6 }}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={(evt) => { evt.stopPropagation(); setSelectedForProfile(f); }} title="Ver perfil" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', padding: 4, borderRadius: 4 }}>
                        <Eye size={15} />
                      </button>
                      <button onClick={(evt) => { evt.stopPropagation(); eliminar(f.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', padding: 6, borderRadius: 6 }}>
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
              <div className="en-perfil-field"><span className="en-perfil-label">DNI</span><span className="en-perfil-value">{selectedForProfile?.DNI || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">CUIL</span><span className="en-perfil-value">{selectedForProfile?.raw?.cuil || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Ocupación</span><span className="en-perfil-value">{selectedForProfile?.Ocupacion || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Teléfono</span><span className="en-perfil-value">{selectedForProfile?.Telefono || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Email</span><span className="en-perfil-value">{selectedForProfile?.Correo_Electronico || '—'}</span></div>
              <div className="en-perfil-field" style={{ gridColumn: '1 / -1' }}><span className="en-perfil-label">Hijos/Alumnos vinculados</span><span className="en-perfil-value">{selectedForProfile?.Hijos || '—'}</span></div>
              <div className="en-perfil-field" style={{ gridColumn: '1 / -1' }}><span className="en-perfil-label">Dirección</span><span className="en-perfil-value">{selectedForProfile?.raw?.calle || '—'} {selectedForProfile?.raw?.numero_calle || ''} {selectedForProfile?.raw?.localidad || ''}{selectedForProfile?.raw?.municipio ? `, ${selectedForProfile.raw.municipio}` : ''}</span></div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
