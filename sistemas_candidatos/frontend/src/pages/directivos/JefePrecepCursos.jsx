import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react';
import { FolderPlus, Users } from 'lucide-react';
import './JefepreceptoresDashboard.css'
import '../../shared.css'
import { API_BASE } from '../../config'

export default function JefePrecepCursos() {
  const [busqueda, setBusqueda] = useState('')
  const [cursos, setCursos] = useState([])

  useEffect(() => {
    apiFetch(`${API_BASE}/cursos/`, { headers: { 'Accept': 'application/json' } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCursos(data || []))
      .catch(() => setCursos([]))
  }, [])

  const filtrados = cursos.filter(c =>
    !busqueda || `${c.año}°${c.division} ${c.carrera}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><FolderPlus size={24} /> Cursos</h2>
          <p className="sh-hero-subtitle">Información de todos los cursos activos</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Buscar curso</label>
            <input className="sh-input" placeholder="1°A, 4°1ra..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="sh-card">
        <table className="en-table">
          <thead className="en-thead">
            <tr className="en-tr">
              <th className="en-th">Año</th>
              <th className="en-th">División</th>
              <th className="en-th">Carrera</th>
              <th className="en-th">Alumnos</th>
              <th className="en-th">Activo</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c, i) => (
              <tr key={i} className="en-tr">
                <td className="en-td">{c.anio}°</td>
                <td className="en-td">{c.division}</td>
                <td className="en-td">{c.carrera}</td>
                <td className="en-td"><Users size={14} style={{ marginRight: 4 }} />{c.alumnos}</td>
                <td className="en-td">
                  <span style={{
                    display: 'inline-flex', padding: '3px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 700,
                    background: c.activo ? '#ecfdf5' : '#fef2f2',
                    color: c.activo ? '#059669' : '#dc2626'
                  }}>{c.activo ? 'Sí' : 'No'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
