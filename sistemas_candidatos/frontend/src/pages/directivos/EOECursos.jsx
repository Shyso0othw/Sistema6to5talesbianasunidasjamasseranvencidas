import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { X, Users, CheckCircle, XCircle } from 'lucide-react'
import '../../shared.css'
import './eoedashboard.css'
import '../estudiante/EstudianteModule.css'
import { API_BASE } from '../../config'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function EOECursos() {
  const [filters, setFilters] = useState({ anio: '', division: '', activo: '' })
  const [cursos, setCursos] = useState([])
  const [, setAlumnos] = useState([]);

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      apiFetch(`${API_BASE}/alumnos/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
    ])
      .then(([cursosData, alumnosData]) => {
        const mapped = (cursosData || []).map(item => ({ id: item.id, Anio: `${item.año}°`, Division: item.division, Carrera: item.carrera || '', Cantidad_Alumnos: (alumnosData || []).filter(a => a.año === item.año && a.division === item.division).length, Activo: item.activo }))
        setCursos(mapped)
        setAlumnos(alumnosData || [])
      })
      .catch(() => {})
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'anio' ? { division: '' } : {})
    }))
  }

  const handleClear = () => setFilters({ anio: '', division: '', activo: '' })

  const filtered = cursos.filter(c => {
    if (filters.anio && c.Anio !== `${filters.anio}°`) return false
    if (filters.division && c.Division !== filters.division) return false
    if (filters.activo && ((filters.activo === 'true' && !c.Activo) || (filters.activo === 'false' && c.Activo))) return false
    return true
  })

  const divisionOptions = () => {
    if (filters.anio === '' || ['1','2','3'].includes(filters.anio)) return ['A','B','C','D','E']
    return ['1ra','2da','3ra','4ta','5ta','6ta']
  }

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Cursos - EOE</h2>
          <p className="sh-hero-subtitle">{(cursos.filter(c => c.Activo).length || 0)} cursos activos · Ciclo Lectivo 2026</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Año</label>
            <select name="anio" value={filters.anio} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              {[1,2,3,4,5,6,7].map(a => <option key={a} value={a}>{a}°</option>)}
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">División</label>
            <select name="division" value={filters.division} onChange={handleChange} className="sh-select">
              <option value="">Todas</option>
              {divisionOptions().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Activo</label>
            <select name="activo" value={filters.activo} onChange={handleChange} className="sh-select">
              <option value="">Todos</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
        <div className="sh-filters-actions">
          <button className="sh-btn-ghost" onClick={handleClear}><X size={16} /> Limpiar filtros</button>
        </div>
      </div>

      <div className="sh-card">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>AÑO</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>DIVISIÓN</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>CARRERA</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>CANT. ALUMNOS</th>
              <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ACTIVO</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ background: '#fff', borderBottom: '1px solid var(--gray-100)' }}>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-main)', fontWeight: 700 }}>{c.Anio}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', background: 'rgba(74, 99, 224, 0.1)', color: '#4a63e0', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{c.Division}</span>
                </td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-soft)', fontWeight: 500 }}>{c.Carrera}</td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 600 }}>{c.Cantidad_Alumnos}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  {c.Activo ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                      <CheckCircle size={14} /> Sí
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                      <XCircle size={14} /> No
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
