import { useState } from 'react';
import { Search, X, Phone } from 'lucide-react';
import '../../shared.css'
import './DirectorDashboard.css'
import '../estudiante/EstudianteModule.css'

const PERSONAL = [
  { id: 1, Nombre: 'María', Apellido: 'García', CUIL: '27-12345678-9', Cargo: 'Profesor', Area: 'Matemática', Departamento: 'Ciencias Exactas', Estado: 'Activo', Situacion_Revista: 'Titular', Telefono: '1122334455' },
  { id: 2, Nombre: 'Carlos', Apellido: 'Méndez', CUIL: '20-23456789-0', Cargo: 'Preceptor', Area: 'Tutoría', Departamento: 'Preceptoría', Estado: 'Activo', Situacion_Revista: 'Titular', Telefono: '1133445566' },
  { id: 3, Nombre: 'Laura', Apellido: 'Fernández', CUIL: '27-34567890-1', Cargo: 'Secretaria', Area: 'Administración', Departamento: 'Dirección', Estado: 'Activo', Situacion_Revista: 'Titular', Telefono: '1144556677' },
  { id: 4, Nombre: 'Pedro', Apellido: 'López', CUIL: '20-45678901-2', Cargo: 'Profesor', Area: 'Inglés', Departamento: 'Idiomas', Estado: 'Licencia', Situacion_Revista: 'Suplente', Telefono: '1155667788' },
  { id: 5, Nombre: 'Ana', Apellido: 'Martínez', CUIL: '27-56789012-3', Cargo: 'Auxiliar', Area: 'Biblioteca', Departamento: 'Recursos', Estado: 'Activo', Situacion_Revista: 'Titular', Telefono: '1166778899' },
  { id: 6, Nombre: 'José', Apellido: 'Rodríguez', CUIL: '20-67890123-4', Cargo: 'Profesor', Area: 'Educación Física', Departamento: 'Deportes', Estado: 'Inactivo', Situacion_Revista: 'Suplente', Telefono: '1177889900' },
  { id: 7, Nombre: 'Silvia', Apellido: 'Díaz', CUIL: '27-78901234-5', Cargo: 'Preceptor', Area: 'Tutoría', Departamento: 'Preceptoría', Estado: 'Activo', Situacion_Revista: 'Titular', Telefono: '1188990011' },
  { id: 8, Nombre: 'Roberto', Apellido: 'Torres', CUIL: '20-89012345-6', Cargo: 'Profesor', Area: 'Historia', Departamento: 'Ciencias Sociales', Estado: 'Activo', Situacion_Revista: 'Titular', Telefono: '1199001122' },
  { id: 9, Nombre: 'Gabriela', Apellido: 'Rivas', CUIL: '27-90123456-7', Cargo: 'Secretaria', Area: 'Administración', Departamento: 'Dirección', Estado: 'Licencia', Situacion_Revista: 'Titular', Telefono: '1200112233' },
  { id: 10, Nombre: 'Héctor', Apellido: 'Morales', CUIL: '20-01234567-8', Cargo: 'Auxiliar', Area: 'Mantenimiento', Departamento: 'Servicios', Estado: 'Activo', Situacion_Revista: 'Titular', Telefono: '1211223344' },
]

const estadoColors = {
  Activo: { bg: 'rgba(5, 150, 105, 0.1)', color: '#059669' },
  Licencia: { bg: 'rgba(217, 119, 6, 0.1)', color: '#d97706' },
  Inactivo: { bg: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' },
}

export default function DirectorPersonal() {
  const [filters, setFilters] = useState({ nombre: '', cargo: '', estado: '' })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleClear = () => setFilters({ nombre: '', cargo: '', estado: '' })

  const filtered = PERSONAL.filter(p => {
    if (filters.nombre && !`${p.Nombre} ${p.Apellido} ${p.CUIL}`.toLowerCase().includes(filters.nombre.toLowerCase())) return false
    if (filters.cargo && !p.Cargo.toLowerCase().includes(filters.cargo.toLowerCase())) return false
    if (filters.estado && p.Estado !== filters.estado) return false
    return true
  })

  const cargos = [...new Set(PERSONAL.map(p => p.Cargo))]
  const estados = [...new Set(PERSONAL.map(p => p.Estado))]

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Gestión de Personal</h2>
          <p className="sh-hero-subtitle">{PERSONAL.length} miembros del personal · Ciclo Lectivo 2026</p>
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
              {cargos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Estado</label>
            <select name="estado" value={filters.estado} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              {estados.map(e => <option key={e} value={e}>{e}</option>)}
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
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Apellido</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>CUIL</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Cargo</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Área</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Dpto</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Estado</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const ec = estadoColors[p.Estado] || { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }
              return (
                <tr key={p.id} style={{ background: '#fff', borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '12px', height: '12px', background: '#059669', borderRadius: '50%' }}></div>
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
                      background: 'rgba(124, 58, 237, 0.1)', 
                      color: '#7c3aed', 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      fontWeight: 600 
                    }}>{p.Cargo}</span>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-soft)', fontWeight: 500 }}>{p.Area}</td>
                  <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-soft)', fontWeight: 500 }}>{p.Departamento}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      padding: '4px 12px', 
                      background: ec.bg, 
                      color: ec.color, 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      fontWeight: 600 
                    }}>{p.Estado}</span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>{p.Telefono}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
