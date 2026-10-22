import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react';
import { ClipboardCheck, Users, CheckCircle, XCircle } from 'lucide-react';
import './JefepreceptoresDashboard.css'
import '../../shared.css'

import { API_BASE } from '../../config'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

const ESTADO_COLORS = {
  P: { bg: '#ecfdf5', color: '#059669', label: 'Presente' },
  A: { bg: '#fef2f2', color: '#dc2626', label: 'Ausente' },
  T: { bg: '#fffbeb', color: '#d97706', label: 'Tardanza' },
  R: { bg: '#f0f0ff', color: '#6366f1', label: 'Retiro' },
}

export default function JefePrecepAsistencia() {
  const [cursoFiltro, setCursoFiltro] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [cursos, setCursos] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const labels = (data || []).map(i => `${i.año}º${i.division}`)
        setCursos(labels)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    apiFetch(`${API_BASE}/asistencias-diarias/?fecha=${fecha}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const mapped = data.map(item => ({
          legajo: item.estudiante,
          alumno: item.estudiante_nombre,
          curso: item.curso_nombre || 'N/A',
          estado: item.estado === 'Presente' ? 'P' : item.estado === 'Ausente' ? 'A' : item.estado === 'Tarde' ? 'T' : 'R',
          justificadas: 0,
          injustificadas: 0,
          observaciones: ''
        }))
        setAsistencias(mapped)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [fecha])

  const filtrados = asistencias.filter(a => !cursoFiltro || a.curso === cursoFiltro)

  const total = filtrados.length
  const presentes = filtrados.filter(a => a.estado === 'P').length
  const ausentes = filtrados.filter(a => a.estado === 'A').length
  const pctGeneral = total > 0 ? Math.round((presentes / total) * 100) : 0

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><ClipboardCheck size={24} /> Control de Asistencia</h2>
          <p className="sh-hero-subtitle">Registro y seguimiento general de asistencia</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Curso</label>
            <select className="sh-select" value={cursoFiltro} onChange={e => setCursoFiltro(e.target.value)}>
              <option value="">Todos los cursos</option>
              {cursos.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Fecha</label>
            <input type="date" className="sh-input" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="sh-card" style={{ padding: 20, textAlign: 'center' }}>
          <Users size={24} style={{ color: '#4a63e0' }} />
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)' }}>{total}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Total Alumnos</div>
        </div>
        <div className="sh-card" style={{ padding: 20, textAlign: 'center' }}>
          <CheckCircle size={24} style={{ color: '#059669' }} />
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)' }}>{presentes}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Presentes</div>
        </div>
        <div className="sh-card" style={{ padding: 20, textAlign: 'center' }}>
          <XCircle size={24} style={{ color: '#dc2626' }} />
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)' }}>{ausentes}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Ausentes</div>
        </div>
        <div className="sh-card" style={{ padding: 20, textAlign: 'center' }}>
          <ClipboardCheck size={24} style={{ color: '#7c3aed' }} />
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)' }}>{pctGeneral}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>% Asistencia General</div>
        </div>
      </div>

      <div className="sh-card">
        <table className="en-table">
          <thead className="en-thead">
            <tr className="en-tr">
              <th className="en-th">Legajo</th>
              <th className="en-th">Alumno</th>
              <th className="en-th">Curso</th>
              <th className="en-th">Estado</th>
              <th className="en-th">Justificadas</th>
              <th className="en-th">Injustificadas</th>
              <th className="en-th">%</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((a, i) => {
              const totalFaltas = a.justificadas + a.injustificadas
              const pct = 100 - Math.min(Math.round((totalFaltas / 30) * 100), 100)
              return (
                <tr key={i} className="en-tr">
                  <td className="en-td">{a.legajo}</td>
                  <td className="en-td">{a.alumno}</td>
                  <td className="en-td">{a.curso}</td>
                  <td className="en-td">
                    <span style={{
                      display: 'inline-flex', padding: '3px 12px', borderRadius: 20,
                      fontSize: 12, fontWeight: 700,
                      background: ESTADO_COLORS[a.estado].bg, color: ESTADO_COLORS[a.estado].color
                    }}>
                      {ESTADO_COLORS[a.estado].label}
                    </span>
                  </td>
                  <td className="en-td">{a.justificadas}</td>
                  <td className="en-td">{a.injustificadas}</td>
                  <td className="en-td">{pct}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
