import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react';
import { UserCheck, Search } from 'lucide-react';
import { API_BASE } from '../../config'
import './SecretariaDireccion.css'
import '../../shared.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function SecretariaDocentes() {
  const [search, setSearch] = useState('')
  const [areaFiltro, setAreaFiltro] = useState('')
  const [docentes, setDocentes] = useState([])
  const [, setLoading] = useState(true);
  const [, setError] = useState(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/docentes/`, { headers: authHeaders() })
      .then(r => {
        if (!r.ok) throw new Error('Error al cargar docentes')
        return r.json()
      })
      .then(data => {
        const mapped = data.map(item => ({
          id: item.id,
          Nombre: item.nombre,
          Apellido: item.apellido,
          CUIL: item.cuil || item.dni || '-',
          Cargo: 'Profesor', // By default, or pull from backend if you have it
          Area: item.departamento_nombre || 'Sin Área',
          Departamento: item.departamento_nombre || 'Sin Departamento',
          Telefono: item.telefono || '-'
        }))
        setDocentes(mapped)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const AREAS = [...new Set(docentes.map(d => d.Area))]

  const filtrados = docentes.filter(d => {
    const nom = `${d.Nombre} ${d.Apellido}`.toLowerCase()
    if (search && !nom.includes(search.toLowerCase())) return false
    if (areaFiltro && d.Area !== areaFiltro) return false
    return true
  })

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><UserCheck size={24} /> Gestión de Docentes</h2>
          <p className="sh-hero-subtitle">Administración del plantel docente</p>
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
            <label className="sh-filter-label">Área</label>
            <select value={areaFiltro} onChange={e => setAreaFiltro(e.target.value)} className="sh-select">
              <option value="">Todas</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="sh-card" style={{ overflowX: 'auto' }}>
        <h3 className="sh-card-title"><UserCheck size={17} /> Docentes ({filtrados.length})</h3>
        <table className="en-table">
          <thead className="en-thead">
            <tr className="en-tr">
              <th className="en-th">Nombre</th>
              <th className="en-th">Apellido</th>
              <th className="en-th">CUIL</th>
              <th className="en-th">Cargo</th>
              <th className="en-th">Área</th>
              <th className="en-th">Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(d => (
              <tr key={d.id} className="en-tr">
                <td className="en-td">{d.Nombre}</td>
                <td className="en-td">{d.Apellido}</td>
                <td className="en-td">{d.CUIL}</td>
                <td className="en-td">
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                    background: d.Cargo === 'Jefe de Area' ? '#fef3c7' : d.Cargo === 'E.Lab' ? '#ede9fe' : '#e0e7ff',
                    color: d.Cargo === 'Jefe de Area' ? '#92400e' : d.Cargo === 'E.Lab' ? '#5b21b6' : '#1e40af'
                  }}>{d.Cargo}</span>
                </td>
                <td className="en-td">{d.Area}</td>
                <td className="en-td">{d.Telefono}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
