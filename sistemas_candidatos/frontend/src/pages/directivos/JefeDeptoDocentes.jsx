import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { Users, Search } from 'lucide-react';
import { API_BASE } from '../../config'
import './jefededepartamento.css'
import '../../shared.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function JefeDeptoDocentes() {
  const [search, setSearch] = useState('')
  const [deptoFiltro, setDeptoFiltro] = useState('')
  const [sitFiltro, setSitFiltro] = useState('')
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
          Cargo: 'Profesor', // Default
          Departamento: item.departamento_nombre || 'Sin Departamento',
          Situacion_Revista: 'Titular', // Default
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

  const DEPARTAMENTOS = [...new Set(docentes.map(d => d.Departamento))]
  const SITUACIONES = [...new Set(docentes.map(d => d.Situacion_Revista))]

  const filtrados = docentes.filter(d => {
    const nom = `${d.Nombre} ${d.Apellido}`.toLowerCase()
    if (search && !nom.includes(search.toLowerCase())) return false
    if (deptoFiltro && d.Departamento !== deptoFiltro) return false
    if (sitFiltro && d.Situacion_Revista !== sitFiltro) return false
    return true
  })

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><Users size={24} /> Docentes del Departamento</h2>
          <p className="sh-hero-subtitle">Gestión de docentes del departamento</p>
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
            <label className="sh-filter-label">Departamento</label>
            <select value={deptoFiltro} onChange={e => setDeptoFiltro(e.target.value)} className="sh-select">
              <option value="">Todos</option>
              {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Situación</label>
            <select value={sitFiltro} onChange={e => setSitFiltro(e.target.value)} className="sh-select">
              <option value="">Todas</option>
              {SITUACIONES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="sh-card" style={{ overflowX: 'auto' }}>
        <h3 className="sh-card-title"><Users size={17} /> Docentes ({filtrados.length})</h3>
        <table className="en-table">
          <thead className="en-thead">
            <tr className="en-tr">
              <th className="en-th">Nombre</th>
              <th className="en-th">Apellido</th>
              <th className="en-th">CUIL</th>
              <th className="en-th">Cargo</th>
              <th className="en-th">Departamento</th>
              <th className="en-th">Situación</th>
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
                <td className="en-td">{d.Departamento}</td>
                <td className="en-td">
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                    background: d.Situacion_Revista === 'Titular' ? '#d1fae5' : d.Situacion_Revista === 'Interino' ? '#fef3c7' : '#fce7f3',
                    color: d.Situacion_Revista === 'Titular' ? '#065f46' : d.Situacion_Revista === 'Interino' ? '#92400e' : '#9d174d'
                  }}>{d.Situacion_Revista}</span>
                </td>
                <td className="en-td">{d.Telefono}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
