import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { Search, X, Phone, Calendar, Trash2, Pencil, Eye } from 'lucide-react';
import AgregarUsuario from '../../components/specific/AgregarUsuario'
import { API_BASE } from '../../config'
import '../../shared.css'
import '../admin/AdminDashboard.css'
import '../estudiante/EstudianteModule.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

const FORMAT_CARGO = {
  directivo: 'Directivo',
  secretaria: 'Secretaría',
  auxiliar: 'Auxiliar',
  bibliotecario: 'Bibliotecario/a',
  eoe: 'EOE',
  ematp: 'EMATP',
  jefe_area: 'Jefe de Área',
  jefe_departamento: 'Jefe de Departamento',
  jefe_preceptores: 'Jefe de Preceptores',
}

export default function PersonalStaff() {
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ nombre: '', rol: '', estado: '' })
  const [editingStaff, setEditingStaff] = useState(null)
  const [selectedForProfile, setSelectedForProfile] = useState(null)

  const loadData = () => {
    Promise.all([
      apiFetch(`${API_BASE}/personal-staff/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      apiFetch(`${API_BASE}/preceptores/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : [])
    ])
      .then(([personalData, preceptoresData]) => {
        const mappedPersonal = personalData.map(item => ({
          ...item,
          id_key: `staff_${item.id}`,
          Nombre: item.nombre || '',
          Apellido: item.apellido || '',
          CUIL: item.cuil || item.dni || '-',
          Rol: FORMAT_CARGO[item.cargo] || item.cargo || '-',
          Estado: item.estado || 'Activo',
          Fecha_de_Ingreso: item.fecha_ingreso || item.fecha_creacion || null,
          Telefono: item.telefono || '-',
          is_preceptor_model: false
        }))
        
        const mappedJefes = preceptoresData
          .filter(p => p.cargo === 'Jefe de Preceptores')
          .map(item => ({
            ...item,
            id_key: `prec_${item.id}`,
            Nombre: item.nombre || '',
            Apellido: item.apellido || '',
            CUIL: item.cuil || item.dni || '-',
            Rol: 'Jefe de Preceptores',
            Estado: item.estado || 'Activo',
            Fecha_de_Ingreso: item.fecha_ingreso || item.fecha_creacion || null,
            Telefono: item.telefono || '-',
            is_preceptor_model: true
          }))

        setStaffList([...mappedPersonal, ...mappedJefes].sort((a, b) => a.Apellido.localeCompare(b.Apellido)))
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleClear = () => {
    setFilters({ nombre: '', rol: '', estado: '' })
  }

  const eliminar = (id, is_preceptor_model) => {
    const endpoint = is_preceptor_model ? 'preceptores' : 'personal-staff'
    apiFetch(`${API_BASE}/${endpoint}/${id}/`, { method: 'DELETE', headers: authHeaders() })
      .then(r => { if (r.ok) setStaffList(prev => prev.filter(p => p.id !== id || p.is_preceptor_model !== is_preceptor_model)) })
      .catch(() => {})
  }

  const filtered = staffList.filter(p => {
    if (filters.nombre && !`${p.Nombre} ${p.Apellido} ${p.CUIL}`.toLowerCase().includes(filters.nombre.toLowerCase())) return false
    if (filters.rol && p.Rol !== filters.rol) return false
    if (filters.estado && p.Estado !== filters.estado) return false
    return true
  })

  if (editingStaff) {
    // Determinar el initialRole en base al modelo
    const initialRole = editingStaff.is_preceptor_model ? 'jefe_preceptores' : (editingStaff.cargo ? editingStaff.cargo.toLowerCase() : 'auxiliar')
    return (
      <div className="sh-page" style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: '#1f2937' }}>
          <Pencil size={24} style={{ color: '#6366f1' }}/> Editar Gestión de Personal
        </h2>
        <AgregarUsuario
          defaultRol={initialRole}
          initialRole={initialRole}
          userToEdit={editingStaff}
          onCancel={() => setEditingStaff(null)}
          onEditSuccess={() => {
            loadData()
            setEditingStaff(null)
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
            <h2 className="sh-hero-title">Gestin de Gestión de Personal</h2>
            <p className="sh-hero-subtitle">Cargando personal...</p>
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
            <h2 className="sh-hero-title">Gestin de Gestión de Personal</h2>
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
          <h2 className="sh-hero-title">Gestin de Gestión de Personal</h2>
          <p className="sh-hero-subtitle">{staffList.length} miembros registrados  Ciclo Lectivo 2026</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Bǧsqueda</label>
            <div className="sh-input-group">
              <Search size={18} className="sh-input-icon" />
              <input type="text" name="nombre" value={filters.nombre} onChange={handleChange} placeholder="Nombre, apellido o CUIL..." className="sh-input sh-input-with-icon" />
            </div>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Rol</label>
            <select name="rol" value={filters.rol} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              {Object.values(FORMAT_CARGO).map(cargo => (
                <option key={cargo} value={cargo}>{cargo}</option>
              ))}
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Estado</label>
            <select name="estado" value={filters.estado} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
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
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ROL</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ESTADO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>FECHA INGRESO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>TEL%FONO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id_key} style={{ background: '#fff', borderBottom: '1px solid var(--gray-100)' }}>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#6366f1', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>{p.Nombre}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>{p.Apellido}</td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-main)', fontFamily: 'monospace' }}>{p.CUIL}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    padding: '4px 10px', 
                    background: 'rgba(99, 102, 241, 0.1)', 
                    color: '#6366f1', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600 
                  }}>{p.Rol}</span>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    padding: '4px 10px', 
                    background: p.Estado === 'Activo' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
                    color: p.Estado === 'Activo' ? '#059669' : '#dc2626', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600 
                  }}>{p.Estado}</span>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>{p.Fecha_de_Ingreso ? new Date(p.Fecha_de_Ingreso).toLocaleDateString('es-AR') : '-'}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>{p.Telefono}</span>
                   </div>
                 </td>
                 <td style={{ padding: '16px 20px' }}>
                   <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditingStaff(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a63e0', display: 'flex', padding: 6, borderRadius: 6 }}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setSelectedForProfile(p)} title="Ver perfil" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', padding: 4, borderRadius: 4 }}>
                        <Eye size={15} />
                      </button>
                      <button onClick={() => eliminar(p.id, p.is_preceptor_model)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', padding: 6, borderRadius: 6 }}>
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
              <div className="en-perfil-field"><span className="en-perfil-label">Rol/Cargo</span><span className="en-perfil-value">{selectedForProfile?.Rol || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Estado</span><span className="en-perfil-value">{selectedForProfile?.Estado || '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Fecha Ingreso</span><span className="en-perfil-value">{selectedForProfile?.Fecha_de_Ingreso ? new Date(selectedForProfile.Fecha_de_Ingreso).toLocaleDateString('es-AR') : '—'}</span></div>
              <div className="en-perfil-field"><span className="en-perfil-label">Teléfono</span><span className="en-perfil-value">{selectedForProfile?.Telefono || '—'}</span></div>
              <div className="en-perfil-field" style={{ gridColumn: '1 / -1' }}><span className="en-perfil-label">Dirección</span><span className="en-perfil-value">{selectedForProfile?.raw?.calle || '—'} {selectedForProfile?.raw?.numero_calle || ''} {selectedForProfile?.raw?.localidad || ''}{selectedForProfile?.raw?.municipio ? `, ${selectedForProfile.raw.municipio}` : ''}</span></div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
