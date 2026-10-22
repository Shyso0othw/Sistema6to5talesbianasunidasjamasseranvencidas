import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react';
import { History, BookOpen, Clock } from 'lucide-react'
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

const ACCION_COLORS = {
  Préstamo: { bg: '#fffbeb', color: '#d97706' },
  Devolución: { bg: '#ecfdf5', color: '#059669' },
}

export default function BibliotecaHistorial() {
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
        console.error('Error fetching historial', err)
        setLoading(false)
      })
  }, [])

  const sorted = [...prestamos].sort((a, b) => {
    const fA = a.fecha_prestamo || ''
    const fB = b.fecha_prestamo || ''
    return fB.localeCompare(fA)
  })

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><History size={24} /> Historial de Préstamos</h2>
          <p className="sh-hero-subtitle">Registro completo de movimientos de la biblioteca</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#667781' }}>Cargando historial...</div>
      ) : (
      <div className="sh-card">
        <table className="en-table">
          <thead className="en-thead">
            <tr className="en-tr">
              <th className="en-th">Fecha</th>
              <th className="en-th">Libro</th>
              <th className="en-th">Usuario</th>
              <th className="en-th">Tipo</th>
              <th className="en-th">Acción</th>
              <th className="en-th">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h, i) => (
              <tr key={i} className="en-tr">
                <td className="en-td">{h.fecha_prestamo || 'N/A'}</td>
                <td className="en-td"><BookOpen size={14} style={{ marginRight: 6 }} />{h.libro_titulo}</td>
                <td className="en-td">{h.usuario_nombre}</td>
                <td className="en-td">
                  <span style={{
                    display: 'inline-flex', padding: '3px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 700,
                    background: '#eff6ff', color: '#2563eb'
                  }}>Usuario</span>
                </td>
                <td className="en-td">
                  <span style={{
                    display: 'inline-flex', padding: '3px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 700,
                    background: h.estado === 'Devuelto' ? ACCION_COLORS['Devolución'].bg : ACCION_COLORS['Préstamo'].bg,
                    color: h.estado === 'Devuelto' ? ACCION_COLORS['Devolución'].color : ACCION_COLORS['Préstamo'].color
                  }}>{h.estado === 'Devuelto' ? 'Devolución' : 'Préstamo'}</span>
                </td>
                <td className="en-td">
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 700,
                    background: ESTADO_COLORS[h.estado]?.bg || '#f3f4f6', 
                    color: ESTADO_COLORS[h.estado]?.color || '#4b5563'
                  }}><Clock size={12} />{h.estado}</span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#667781' }}>
                  No se encontraron registros
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
