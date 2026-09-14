import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react';
import { UserCog, Phone } from 'lucide-react';
import { API_BASE } from '../../config'
import './JefepreceptoresDashboard.css'
import '../../shared.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function JefePrecepPreceptores() {
  const [filtroCargo, setFiltroCargo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
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
          nombre: item.nombre,
          apellido: item.apellido,
          cuil: item.cuil || item.dni || '-',
          cargo: item.cargo || '-',
          estado: item.estado || 'Activo',
          ingreso: item.fecha_creacion ? item.fecha_creacion.substring(0, 10) : '-',
          telefono: item.telefono || '-'
        }))
        setPreceptores(mapped)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const CARGOS = [...new Set(preceptores.map(p => p.cargo))]
  const ESTADOS = [...new Set(preceptores.map(p => p.estado))]

  const filtrados = preceptores.filter(p => {
    if (filtroCargo && p.cargo !== filtroCargo) return false
    if (filtroEstado && p.estado !== filtroEstado) return false
    return true
  })

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><UserCog size={24} /> Gestión de Preceptores</h2>
          <p className="sh-hero-subtitle">Organizar turnos, guardias y supervisión</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Cargo</label>
            <select className="sh-select" value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)}>
              <option value="">Todos los cargos</option>
              {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Estado</label>
            <select className="sh-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="sh-card">
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
            {filtrados.map((p, i) => (
              <tr key={i} className="en-tr">
                <td className="en-td">{p.nombre}</td>
                <td className="en-td">{p.apellido}</td>
                <td className="en-td">{p.cuil}</td>
                <td className="en-td">
                  <span style={{
                    display: 'inline-flex', padding: '3px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 700,
                    background: p.cargo === 'Titular' ? '#ecfdf5' : p.cargo === 'Provisional' ? '#fffbeb' : '#f0f0ff',
                    color: p.cargo === 'Titular' ? '#059669' : p.cargo === 'Provisional' ? '#d97706' : '#6366f1'
                  }}>{p.cargo}</span>
                </td>
                <td className="en-td">
                  <span style={{
                    display: 'inline-flex', padding: '3px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 700,
                    background: p.estado === 'Activo' ? '#ecfdf5' : '#fef2f2',
                    color: p.estado === 'Activo' ? '#059669' : '#dc2626'
                  }}>{p.estado}</span>
                </td>
                <td className="en-td">{p.ingreso}</td>
                <td className="en-td"><Phone size={14} style={{ marginRight: 4 }} />{p.telefono}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
