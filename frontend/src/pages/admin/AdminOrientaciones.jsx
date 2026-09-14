import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { Search, Edit, Trash2, Plus, Check } from 'lucide-react';
import { API_BASE } from '../../config'
import '../../shared.css'
import './AdminDashboard.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function AdminOrientaciones() {
  const [orientaciones, setOrientaciones] = useState([])
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [showCrear, setShowCrear] = useState(false)
  const [editingOrientacion, setEditingOrientacion] = useState(null)
  
  const [nuevaOrientacion, setNuevaOrientacion] = useState({ nombre: '', descripcion: '', estado: true })
  const [selectedCursosIds, setSelectedCursosIds] = useState([])
  
  const fetchDatos = () => {
    Promise.all([
      apiFetch(`${API_BASE}/orientaciones/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
    ])
      .then(([oriData, curData]) => {
        setOrientaciones(oriData)
        setCursos(curData)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchDatos()
  }, [])

  const handleCrear = () => {
    if (!nuevaOrientacion.nombre.trim()) return
    apiFetch(`${API_BASE}/orientaciones/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        nombre: nuevaOrientacion.nombre,
        descripcion: nuevaOrientacion.descripcion,
        estado: nuevaOrientacion.estado
      })
    })
      .then(r => {
        if (!r.ok) throw new Error('Error al crear orientación')
        return r.json()
      })
      .then(async (newOri) => {
        await updateCursos(newOri.id)
        setNuevaOrientacion({ nombre: '', descripcion: '', estado: true })
        setShowCrear(false)
        fetchDatos()
      })
      .catch(err => alert(err.message))
  }

  const handleEditar = () => {
    if (!editingOrientacion.nombre.trim()) return
    apiFetch(`${API_BASE}/orientaciones/${editingOrientacion.id}/`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        nombre: editingOrientacion.nombre,
        descripcion: editingOrientacion.descripcion,
        estado: editingOrientacion.estado
      })
    })
      .then(r => {
        if (!r.ok) throw new Error('Error al editar orientación')
        return r.json()
      })
      .then(async () => {
        await updateCursos(editingOrientacion.id)
        setEditingOrientacion(null)
        fetchDatos()
      })
      .catch(err => alert(err.message))
  }

  const handleEliminar = (id) => {
    if (!confirm('¿Estás seguro de eliminar esta orientación?')) return
    apiFetch(`${API_BASE}/orientaciones/${id}/`, {
      method: 'DELETE',
      headers: authHeaders()
    })
      .then(r => {
        if (!r.ok) throw new Error('Error al eliminar orientación')
        fetchDatos()
      })
      .catch(err => alert(err.message))
  }

  const filteredOrientaciones = orientaciones.filter(o => 
    o.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.descripcion && o.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getCursosAsignados = (oriId) => {
    return cursos.filter(c => c.orientacion === oriId).map(c => `${c.año}° ${c.division}`).join(', ') || 'Ninguno'
  }

  const updateCursos = async (orientacionId) => {
    const promises = cursos.map(c => {
      const currentlyAssigned = c.orientacion === orientacionId
      const shouldBeAssigned = selectedCursosIds.includes(c.id)
      
      if (currentlyAssigned && !shouldBeAssigned) {
        return apiFetch(`${API_BASE}/cursos/${c.id}/`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ orientacion: null }) })
      } else if (!currentlyAssigned && shouldBeAssigned) {
        return apiFetch(`${API_BASE}/cursos/${c.id}/`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ orientacion: orientacionId }) })
      }
      return Promise.resolve()
    })
    return Promise.all(promises)
  }

  const toggleCurso = (cursoId) => {
    setSelectedCursosIds(prev => prev.includes(cursoId) ? prev.filter(id => id !== cursoId) : [...prev, cursoId])
  }

  if (loading) return <div className="sh-page"><div className="sh-hero"><h2 className="sh-hero-title">Cargando Orientaciones...</h2></div></div>
  if (error) return <div className="sh-page"><div className="sh-hero"><h2 className="sh-hero-title" style={{color: 'red'}}>Error: {error}</h2></div></div>

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Gestión de Orientaciones / Carreras</h2>
          <p className="sh-hero-subtitle">{orientaciones.length} orientaciones registradas</p>
        </div>
      </div>

      <div className="sh-filters-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="sh-input-group" style={{ maxWidth: '300px' }}>
          <Search size={18} className="sh-input-icon" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o descripción..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="sh-input sh-input-with-icon" 
          />
        </div>
        <button className="sh-btn-ghost" onClick={() => { setShowCrear(true); setSelectedCursosIds([]); }} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Plus size={16} /> Nueva Orientación
        </button>
      </div>

      {showCrear && (
        <div className="sh-card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Crear Orientación</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label className="sh-filter-label">Nombre</label>
              <input 
                type="text" 
                value={nuevaOrientacion.nombre} 
                onChange={(e) => setNuevaOrientacion(prev => ({ ...prev, nombre: e.target.value }))} 
                className="sh-input" 
              />
            </div>
            <div>
              <label className="sh-filter-label">Estado</label>
              <select 
                value={nuevaOrientacion.estado ? 'activo' : 'inactivo'} 
                onChange={(e) => setNuevaOrientacion(prev => ({ ...prev, estado: e.target.value === 'activo' }))} 
                className="sh-select"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label className="sh-filter-label">Descripción</label>
            <textarea 
              value={nuevaOrientacion.descripcion} 
              onChange={(e) => setNuevaOrientacion(prev => ({ ...prev, descripcion: e.target.value }))} 
              className="sh-input"
              rows="3"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label className="sh-filter-label">Cursos Asociados</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginTop: '10px' }}>
              {cursos.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--gray-50)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                  <input type="checkbox" checked={selectedCursosIds.includes(c.id)} onChange={() => toggleCurso(c.id)} />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}>{c.año}° {c.division}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="sh-btn-ghost" onClick={() => setShowCrear(false)} style={{ color: 'red' }}>Cancelar</button>
            <button className="sh-btn-ghost" onClick={handleCrear} style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '5px' }}><Check size={16} /> Guardar</button>
          </div>
        </div>
      )}

      {editingOrientacion && (
        <div className="sh-card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Editar Orientación</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label className="sh-filter-label">Nombre</label>
              <input 
                type="text" 
                value={editingOrientacion.nombre} 
                onChange={(e) => setEditingOrientacion(prev => ({ ...prev, nombre: e.target.value }))} 
                className="sh-input" 
              />
            </div>
            <div>
              <label className="sh-filter-label">Estado</label>
              <select 
                value={editingOrientacion.estado ? 'activo' : 'inactivo'} 
                onChange={(e) => setEditingOrientacion(prev => ({ ...prev, estado: e.target.value === 'activo' }))} 
                className="sh-select"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label className="sh-filter-label">Descripción</label>
            <textarea 
              value={editingOrientacion.descripcion || ''} 
              onChange={(e) => setEditingOrientacion(prev => ({ ...prev, descripcion: e.target.value }))} 
              className="sh-input"
              rows="3"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label className="sh-filter-label">Cursos Asociados</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginTop: '10px' }}>
              {cursos.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--gray-50)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                  <input type="checkbox" checked={selectedCursosIds.includes(c.id)} onChange={() => toggleCurso(c.id)} />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}>{c.año}° {c.division}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="sh-btn-ghost" onClick={() => setEditingOrientacion(null)} style={{ color: 'red' }}>Cancelar</button>
            <button className="sh-btn-ghost" onClick={handleEditar} style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '5px' }}><Check size={16} /> Guardar Cambios</button>
          </div>
        </div>
      )}

      <div className="sh-card">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Orientación</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Descripción</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Cursos Integrados</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Estado</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrientaciones.map(o => (
              <tr key={o.id} style={{ background: '#fff', borderBottom: '1px solid var(--gray-100)' }}>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-main)', fontWeight: 600 }}>{o.nombre}</td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-soft)' }}>{o.descripcion || '-'}</td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-soft)' }}>{getCursosAsignados(o.id)}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    padding: '4px 10px', 
                    background: o.estado ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
                    color: o.estado ? '#059669' : '#dc2626', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600 
                  }}>{o.estado ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setEditingOrientacion(o); setSelectedCursosIds(cursos.filter(c => c.orientacion === o.id).map(c => c.id)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a63e0' }}>
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleEliminar(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
