import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { Search, X, Phone, Mail, Trash2, Pencil } from 'lucide-react'
import AgregarUsuario from '../../components/specific/AgregarUsuario'
import { API_BASE } from '../../config'
import '../../shared.css'
import './AdminDashboard.css'
import '../estudiante/EstudianteModule.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

const CARGO_LABELS = {
  directivo: "Directivo",
  secretaria: "Secretaría",
  auxiliar: "Auxiliar",
  bibliotecario: "Bibliotecario",
  eoe: "EOE",
  ematp: "EMATP",
  jefe_preceptores: "Jefe de Preceptores",
  jefe_area: "Jefe de Área",
  jefe_departamento: "Jefe de Departamento"
};

export default function AdminStaff() {
  const [staff, setstaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ nombre: '', cargo: '' })

  const [editingmiembro, setEditingmiembro] = useState(null)


  useEffect(() => {
    apiFetch(`${API_BASE}/staff/`, { headers: authHeaders() })
      .then(r => { if (!r.ok) throw new Error('Error al cargar staff'); return r.json() })
      .then(data => {
        const mapped = data.map(item => ({
          id: item.id,
          Nombre: item.nombre || '',
          Apellido: item.apellido || '',
          CUIL: item.cuil || '-',
          Cargo: item.cargo || '-',
          Telefono: item.telefono || '-',
          Correo_abc: item.email || '-',
          raw: item,
        }))
        setstaff(mapped)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleClear = () => {
    setFilters({ nombre: '', cargo: '' })
  }

  const eliminar = (id) => {
    apiFetch(`${API_BASE}/staff/${id}/`, { method: 'DELETE', headers: authHeaders() })
      .then(r => { if (r.ok) setstaff(prev => prev.filter(d => d.id !== id)) })
      .catch(() => {})
  }

  const filtered = staff.filter(d => {
    let match = true
    if (filters.nombre) {
      const search = filters.nombre.toLowerCase()
      const nom = `${d.Nombre} ${d.Apellido}`.toLowerCase()
      if (!nom.includes(search)) match = false
    }
    if (filters.cargo && d.raw.cargo !== filters.cargo) {
      match = false
    }
    return match
  })

  if (editingmiembro) {
    return (
      <div className="sh-page" style={{ padding: 0 }}>
        <AgregarUsuario
          defaultRol={editingmiembro?.rol || ""}
          initialRole="miembro"
          userToEdit={editingmiembro}
          onCancel={() => setEditingmiembro(null)}
          onEditSuccess={(updated) => {
            setstaff(prev => prev.map(d => d.id === updated.id ? { ...d, raw: updated, Nombre: updated.nombre, Apellido: updated.apellido, CUIL: updated.cuil, Cargo: updated.cargo, Telefono: updated.telefono, Correo_abc: updated.email } : d));
            setEditingmiembro(null);
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
            <h2 className="sh-hero-title">Gestión de staff</h2>
            <p className="sh-hero-subtitle">Cargando staff...</p>
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
            <h2 className="sh-hero-title">Gestión de staff</h2>
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
          <h2 className="sh-hero-title">Gestión de staff</h2>
          <p className="sh-hero-subtitle">{staff.length} staff registrados · Ciclo Lectivo 2026</p>
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
              <option value="">Todos los cargos</option>
              <option value="directivo">Directivo</option>
              <option value="secretaria">Secretaría</option>
              <option value="auxiliar">Auxiliar</option>
              <option value="bibliotecario">Bibliotecario</option>
              <option value="eoe">EOE</option>
              <option value="ematp">EMATP</option>
              <option value="jefe_preceptores">Jefe de Preceptores</option>
              <option value="jefe_area">Jefe de Área</option>
              <option value="jefe_departamento">Jefe de Departamento</option>
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
                  }}>{CARGO_LABELS[d.Cargo] || d.Cargo}</span>
                </td>
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
                     <button onClick={(evt) => { evt.stopPropagation(); setEditingmiembro(d.raw); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a63e0', display: 'flex', padding: 6, borderRadius: 6 }}>
                       <Pencil size={16} />
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
    </div>
  )
}
