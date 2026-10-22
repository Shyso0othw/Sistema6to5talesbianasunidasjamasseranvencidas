import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { Users, Search } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect'
import { API_BASE } from '../../config'
import './JefeArea.css'
import '../../shared.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function JefeAreaDocentes() {
  const [search, setSearch] = useState('')
  const [areaFiltro, setAreaFiltro] = useState('')
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
          Cargo: 'Profesor',
          Area: item.departamento_nombre || 'Sin Área',
          Departamento: item.departamento_nombre || 'Sin Departamento',
          Situacion_Revista: 'Titular',
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
  const SITUACIONES = [...new Set(docentes.map(d => d.Situacion_Revista))]

  const filtrados = docentes.filter(d => {
    const nom = `${d.Nombre} ${d.Apellido}`.toLowerCase()
    if (search && !nom.includes(search.toLowerCase())) return false
    if (areaFiltro && d.Area !== areaFiltro) return false
    if (sitFiltro && d.Situacion_Revista !== sitFiltro) return false
    return true
  })

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><Users size={24} /> Docentes del Área</h2>
          <p className="sh-hero-subtitle">Gestión de docentes asignados al área</p>
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
            <CustomSelect
              options={[
                { value: '', label: 'Todas' },
                ...AREAS.map(a => ({ value: a, label: a }))
              ]}
              value={areaFiltro}
              onChange={e => setAreaFiltro(e.target.value)}
            />
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Situación</label>
            <CustomSelect
              options={[
                { value: '', label: 'Todas' },
                ...SITUACIONES.map(s => ({ value: s, label: s }))
              ]}
              value={sitFiltro}
              onChange={e => setSitFiltro(e.target.value)}
            />
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
              <th className="en-th">Área</th>
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
                <td className="en-td">{d.Area}</td>
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
