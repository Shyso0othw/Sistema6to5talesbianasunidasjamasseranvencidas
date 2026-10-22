import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react';
import { UserCog, Search } from 'lucide-react';
import { API_BASE } from '../../config'
import './SecretariaDireccion.css'
import '../../shared.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function SecretariaPreceptores() {
  const [search, setSearch] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [preceptores, setPreceptores] = useState([])
  const [, setLoading] = useState(true);
  const [, setError] = useState(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/preceptores/`, { headers: authHeaders() })
      .then(r => {
        if (!r.ok) throw new Error('Error al cargar preceptores')
        return r.json()
      })
      .then(data => {
        const mapped = data.map(item => ({
          id: item.id,
          Nombre: item.nombre,
          Apellido: item.apellido,
          CUIL: item.cuil || item.dni || '-',
          Cargo: item.cargo || '-',
          Estado: item.estado || 'Activo',
          Fecha_Ingreso: item.fecha_creacion ? item.fecha_creacion.substring(0, 10) : '-',
          Telefono: item.telefono || '-'
        }))
        setPreceptores(mapped)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const ESTADOS = [...new Set(preceptores.map(p => p.Estado))]

  const filtrados = preceptores.filter(p => {
    const nom = `${p.Nombre} ${p.Apellido}`.toLowerCase()
    if (search && !nom.includes(search.toLowerCase())) return false
    if (estadoFiltro && p.Estado !== estadoFiltro) return false
    return true
  })

  const estadoBadge = (estado) => {
    const map = {
      Activo: { bg: '#d1fae5', color: '#065f46' },
      Licencia: { bg: '#fef3c7', color: '#92400e' },
      Inactivo: { bg: '#fce7f3', color: '#9d174d' },
    }
    const s = map[estado] || { bg: '#f3f4f6', color: '#374151' }
    return { background: s.bg, color: s.color, display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }
  }

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><UserCog size={24} /> Gestión de Preceptores</h2>
          <p className="sh-hero-subtitle">Administración del equipo de preceptores</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Búsqueda</label>
            <div className="sh-input-group">
              <Search size={18} className="sh-input-icon" />
              <input placeholder="Nombre o apellido..." className="sh-input sh-input-with-icon" type="text" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Estado</label>
            <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} className="sh-select">
              <option value="">Todos</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="sh-card" style={{ overflowX: 'auto' }}>
        <h3 className="sh-card-title"><UserCog size={17} /> Preceptores ({filtrados.length})</h3>
        <table className="en-table">
          <thead className="en-thead">
            <tr className="en-tr">
              <th className="en-th">Nombre</th>
              <th className="en-th">Apellido</th>
              <th className="en-th">CUIL</th>
              <th className="en-th">Cargo</th>
              <th className="en-th">Estado</th>
              <th className="en-th">Ingreso</th>
              <th className="en-th">Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => (
              <tr key={p.id} className="en-tr">
                <td className="en-td">{p.Nombre}</td>
                <td className="en-td">{p.Apellido}</td>
                <td className="en-td">{p.CUIL}</td>
                <td className="en-td">{p.Cargo}</td>
                <td className="en-td"><span style={estadoBadge(p.Estado)}>{p.Estado}</span></td>
                <td className="en-td">{new Date(p.Fecha_Ingreso).toLocaleDateString('es-AR')}</td>
                <td className="en-td">{p.Telefono}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
