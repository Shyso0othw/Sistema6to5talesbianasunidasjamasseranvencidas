import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react';
import { BookOpen, Book, Search } from 'lucide-react'
import { API_BASE } from '../../config'
import './biblioteca.css'
import '../../shared.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function BibliotecaCatalogo() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroDisp, setFiltroDisp] = useState('')
  const [libros, setLibros] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`${API_BASE}/libros/`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        setLibros(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching libros', err)
        setLoading(false)
      })
  }, [])

  const filtrados = libros.filter(l => {
    const matchBusqueda = !busqueda || l.titulo.toLowerCase().includes(busqueda.toLowerCase()) || l.autor.toLowerCase().includes(busqueda.toLowerCase())
    if (filtroDisp === 'disponible') return matchBusqueda && l.disponibles > 0
    if (filtroDisp === 'nodisponible') return matchBusqueda && l.disponibles === 0
    return matchBusqueda
  })

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><BookOpen size={24} /> Catálogo de Libros</h2>
          <p className="sh-hero-subtitle">Consulta de stock y ubicación</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group" style={{ gridColumn: '1 / -1' }}>
            <label className="sh-filter-label">Buscar por título o autor</label>
            <div className="sh-input-group">
              <Search size={18} className="sh-input-icon" />
              <input className="sh-input sh-input-with-icon" placeholder="Buscar libro..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Disponibilidad</label>
            <select className="sh-select" value={filtroDisp} onChange={e => setFiltroDisp(e.target.value)}>
              <option value="">Todos</option>
              <option value="disponible">Disponible</option>
              <option value="nodisponible">No disponible</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#667781' }}>Cargando catálogo...</div>
      ) : (
      <div className="sh-card">
        <table className="en-table">
          <thead className="en-thead">
            <tr className="en-tr">
              <th className="en-th">Título</th>
              <th className="en-th">Autor</th>
              <th className="en-th">Copias</th>
              <th className="en-th">Disponibles</th>
              <th className="en-th">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((l, i) => (
              <tr key={i} className="en-tr">
                <td className="en-td"><Book size={14} style={{ marginRight: 6 }} />{l.titulo}</td>
                <td className="en-td">{l.autor}</td>
                <td className="en-td">{l.copias}</td>
                <td className="en-td">{l.disponibles}</td>
                <td className="en-td">
                  <span style={{
                    display: 'inline-flex', padding: '3px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 700,
                    background: l.disponibles > 0 ? '#ecfdf5' : '#fef2f2',
                    color: l.disponibles > 0 ? '#059669' : '#dc2626'
                  }}>
                    {l.disponibles > 0 ? 'Disponible' : 'No disponible'}
                  </span>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#667781' }}>
                  No se encontraron libros
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
