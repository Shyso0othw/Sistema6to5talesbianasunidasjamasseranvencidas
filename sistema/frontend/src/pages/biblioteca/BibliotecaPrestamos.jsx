import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react';
import { BookOpen, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../../config'
import './biblioteca.css'
import '../../shared.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

const ESTADO_COLORS = {
  'Al dia': { bg: '#eff6ff', color: '#2563eb' },
  Demorado: { bg: '#fef2f2', color: '#dc2626' },
  Devuelto: { bg: '#ecfdf5', color: '#059669' },
}

export default function BibliotecaPrestamos() {
  const [filtroEstado, setFiltroEstado] = useState('')
  const [prestamos, setPrestamos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`${API_BASE}/prestamos/`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        setPrestamos(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching prestamos', err)
        setLoading(false)
      })
  }, [])

  const filtrados = prestamos.filter(p => !filtroEstado || p.estado === filtroEstado)

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><BookOpen size={24} /> Préstamos</h2>
          <p className="sh-hero-subtitle">Registro de material prestado</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Estado</label>
            <select className="sh-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="Al dia">Al día</option>
              <option value="Demorado">Demorado</option>
              <option value="Devuelto">Devuelto</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#667781' }}>Cargando préstamos...</div>
      ) : (
      <div className="sh-card">
        <table className="en-table">
          <thead className="en-thead">
            <tr className="en-tr">
              <th className="en-th">Libro</th>
              <th className="en-th">Usuario</th>
              <th className="en-th">Fecha Préstamo</th>
              <th className="en-th">Fecha Devolución</th>
              <th className="en-th">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p, i) => (
              <tr key={i} className="en-tr">
                <td className="en-td">{p.libro_titulo}</td>
                <td className="en-td">{p.usuario_nombre}</td>
                <td className="en-td">{p.fecha_prestamo || 'N/A'}</td>
                <td className="en-td">{p.fecha_devolucion || 'N/A'}</td>
                <td className="en-td">
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 700,
                    background: ESTADO_COLORS[p.estado]?.bg || '#f3f4f6', 
                    color: ESTADO_COLORS[p.estado]?.color || '#4b5563'
                  }}>
                    {p.estado === 'Demorado' && <AlertTriangle size={12} />}
                    {p.estado === 'Al dia' && <Clock size={12} />}
                    {p.estado === 'Devuelto' && <Calendar size={12} />}
                    {p.estado}
                  </span>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#667781' }}>
                  No se encontraron préstamos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
