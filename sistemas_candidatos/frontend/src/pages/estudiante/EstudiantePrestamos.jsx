import { apiFetch } from '../../api/http.js'
import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Book, Search, AlertCircle } from 'lucide-react';
import '../../shared.css'
import '../../components/specific/AgregarAlumno.css'
import { API_BASE } from '../../config'

const SUBTABS = [
  { id: 'mis-prestamos', label: 'Mis Préstamos', icon: BookOpen },
  { id: 'catalogo', label: 'Catálogo', icon: Search },
]

export default function EstudiantePrestamos() {
  const [subTab, setSubTab] = useState('mis-prestamos')
  const [prestamos, setPrestamos] = useState([])
  const [libros, setLibros] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const userId = parseInt(localStorage.getItem('user_id') || sessionStorage.getItem('user_id') || '0')

  const cargarPrestamos = useCallback(() => apiFetch(`${API_BASE}/prestamos/?usuario=${userId}`).then(r => {
    if (!r.ok) throw new Error('No se pudieron cargar los préstamos')
    return r.json()
  }).then(setPrestamos).catch(error => setError(error.message)), [userId])
  useEffect(() => {
    Promise.all([cargarPrestamos(), apiFetch(`${API_BASE}/libros/`).then(r => {
      if (!r.ok) throw new Error('No se pudo cargar el catálogo')
      return r.json()
    }).then(setLibros)]).catch(error => setError(error.message)).finally(() => setLoading(false))
  }, [cargarPrestamos])

  const handleSolicitar = async (libroId) => {
    setError('')
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const r = await apiFetch(`${API_BASE}/prestamos/solicitar/`, {
        method: 'POST', headers,
        body: JSON.stringify({ libro_id: libroId, usuario_id: userId }),
      })
      if (!r.ok) {
        const err = await r.json()
        throw new Error(err.detail || 'Error al solicitar')
      }
      await cargarPrestamos()
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(''), 3000)
    }
  }

  const librosFiltrados = libros.filter(l =>
    !busqueda || l.titulo?.toLowerCase().includes(busqueda.toLowerCase()) || l.autor?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const estadoBadge = (estado) => {
    const colors = {
      'Pendiente': { bg: '#fffbeb', color: '#d97706' },
      'Solicitado': { bg: '#fef2f2', color: '#dc2626' },
      'Al dia': { bg: '#ecfdf5', color: '#059669' },
      'En posesion': { bg: '#ecfdf5', color: '#059669' },
      'Demorado': { bg: '#fef2f2', color: '#dc2626' },
      'Devuelto': { bg: '#eff6ff', color: '#2563eb' },
      'Rechazado': { bg: '#f3f4f6', color: '#6b7280' },
    }
    const c = colors[estado] || { bg: '#f3f4f6', color: '#6b7280' }
    return (
      <span style={{ display: 'inline-flex', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: c.bg, color: c.color }}>
        {estado}
      </span>
    )
  }

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><BookOpen size={24} /> Préstamos</h2>
          <p className="sh-hero-subtitle">Gestioná tus préstamos de la biblioteca</p>
        </div>
      </div>

      <div className="sh-tabs" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {SUBTABS.map(t => (
          <button key={t.id}
            className={`sh-btn-action-small ${subTab === t.id ? 'sh-btn-action-small--active' : ''}`}
            style={subTab === t.id ? { background: 'var(--navy)', color: '#fff' } : {}}
            onClick={() => setSubTab(t.id)}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="agregar-alumno-error" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {subTab === 'mis-prestamos' && (
        <div className="sh-card">
          {loading ? <p className="sh-empty-text">Cargando...</p> : prestamos.length === 0 ? (
            <p className="sh-empty-text">No tenés préstamos registrados</p>
          ) : (
            <table className="en-table">
              <thead className="en-thead">
                <tr className="en-tr">
                  <th className="en-th">Libro</th>
                  <th className="en-th">Fecha Préstamo</th>
                  <th className="en-th">Fecha Entrega</th>
                  <th className="en-th">Horario</th>
                  <th className="en-th">Estado</th>
                  <th className="en-th">Acción</th>
                </tr>
              </thead>
              <tbody>
                {prestamos.map(p => (
                  <tr key={p.id} className="en-tr">
                    <td className="en-td"><Book size={14} style={{ marginRight: 6 }} />{p.libro_titulo}</td>
                    <td className="en-td">{p.fecha_prestamo}</td>
                    <td className="en-td">{p.fecha_entrega}</td>
                    <td className="en-td">{p.hora_desde && p.hora_hasta ? `${p.hora_desde} - ${p.hora_hasta}` : '—'}</td>
                    <td className="en-td">{estadoBadge(p.estado)}</td>
                    <td className="en-td">
                      {['Pendiente', 'Solicitado'].includes(p.estado) ? 'Pendiente de aprobación por biblioteca' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {subTab === 'catalogo' && (
        <>
          <div className="sh-filters-container">
            <div className="sh-filters-grid">
              <div className="sh-filter-group" style={{ gridColumn: '1 / -1' }}>
                <label className="sh-filter-label">Buscar por título o autor</label>
                <div className="sh-input-group">
                  <Search size={18} className="sh-input-icon" />
                  <input className="sh-input sh-input-with-icon" placeholder="Buscar libro..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="sh-card">
            {loading ? <p className="sh-empty-text">Cargando...</p> : librosFiltrados.length === 0 ? (
              <p className="sh-empty-text">No se encontraron libros</p>
            ) : (
              <table className="en-table">
                <thead className="en-thead">
                  <tr className="en-tr">
                    <th className="en-th">Título</th>
                    <th className="en-th">Autor</th>
                    <th className="en-th">Copias</th>
                    <th className="en-th">Disponibles</th>
                    <th className="en-th">Estado</th>
                    <th className="en-th">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {librosFiltrados.map(l => (
                    <tr key={l.id} className="en-tr">
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
                      <td className="en-td">
                        <button className="sh-btn-action-small" style={{ background: '#eff6ff', color: '#2563eb', border: 'none' }}
                          disabled={l.disponibles < 1}
                          onClick={() => handleSolicitar(l.id)}>
                          Solicitar Préstamo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
