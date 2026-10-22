import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { BookOpen, AlertTriangle } from 'lucide-react'
import './EstudianteModule.css'
import { API_BASE } from '../../config'

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || ""
const authHeaders = () => {
  const t = getToken()
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

const fetchBoletin = async () => {
  const r = await apiFetch(`${API_BASE}/boletin/`, { headers: authHeaders() })
  if (!r.ok) throw new Error('Error al cargar boletín')
  return r.json()
}

const FILAS = [
  { id: 'v1', label: 'Valoración 1° Cuatrimestre' },
  { id: 'n1', label: 'Nota 1° Cuatrimestre' },
  { id: 'vi1', label: 'Validación Intensificación 1° C.' },
  { id: 'i1', label: 'Intensificación 1° Cuatrimestre' },
  { id: 'v2', label: 'Valoración 2° Cuatrimestre' },
  { id: 'n2', label: 'Nota 2° Cuatrimestre' },
  { id: 'dic', label: 'Diciembre' },
  { id: 'mar', label: 'Marzo' },
  { id: 'inasistencias', label: 'Inasistencias' },
  { id: 'def', label: 'Calificación Definitiva' },
]

function notaCls(valor) {
  if (valor === null || valor === undefined || valor === '') return 'boletin-nota--empty'
  if (valor >= 8) return 'boletin-nota--alta'
  if (valor >= 6) return 'boletin-nota--media'
  return 'boletin-nota--baja'
}

function renderNota(valor, isFilaInasistencia = false) {
  const cls = isFilaInasistencia ? '' : notaCls(valor)
  if (valor === null || valor === undefined || valor === '') {
    return <span className={isFilaInasistencia ? '' : `boletin-nota ${cls}`}>—</span>
  }
  return <span className={isFilaInasistencia ? '' : `boletin-nota ${cls}`}>{valor}</span>
}

function getValor(notasMateria, filaId) {
  if (!notasMateria) return null
  if (filaId === 'def') return notasMateria.definitiva
  return notasMateria[filaId] ?? null
}

export default function EstudianteNotas({ nombre }) {
  const [notasArr, setNotasArr] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBoletin()
      .then(arr => setNotasArr(arr))
      .catch(() => ({}))
      .finally(() => setLoading(false))
  }, [])

  const definitivas = notasArr.map(n => n.definitiva).filter(d => d !== null && d !== undefined)
  const prom = definitivas.length > 0 ? (definitivas.reduce((a, b) => a + b, 0) / definitivas.length).toFixed(1) : '—'
  const aprobadas = definitivas.filter(d => d >= 6).length
  const desaprobadas = definitivas.filter(d => d < 6).length
  const totalInas = notasArr.reduce((a, m) => a + (m.inasistencias || 0), 0)

  if (loading) return <p className="sh-empty-text" style={{ textAlign:'center', padding:'3rem' }}>Cargando boletín...</p>

  if (notasArr.length === 0) return <div className="sh-page"><div className="sh-hero"><div className="sh-hero-content"><h2 className="sh-hero-title">Boletín de Notas</h2><p className="sh-hero-subtitle">{nombre || 'Estudiante'} · Ciclo Lectivo 2026</p></div></div><div className="sh-card" style={{ textAlign:'center', padding:'3rem', color:'var(--text-soft)' }}>No hay materias asignadas a tu curso.</div></div>

  const intensificar = notasArr.filter(m => m.definitiva !== null && m.definitiva < 6)

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Boletín de Notas</h2>
          <p className="sh-hero-subtitle">
            {nombre || 'Estudiante'} · Ciclo Lectivo 2026
          </p>
        </div>
        <div className="sh-hero-actions">
          <div className="boletin-stats">
            <div className="boletin-stat boletin-stat--prom">
              <span className="boletin-stat-valor">{prom}</span>
              <span className="boletin-stat-label">Promedio</span>
            </div>
            <div className="boletin-stat boletin-stat--apro">
              <span className="boletin-stat-valor">{aprobadas}</span>
              <span className="boletin-stat-label">Aprobadas</span>
            </div>
            <div className="boletin-stat boletin-stat--desa">
              <span className="boletin-stat-valor">{desaprobadas}</span>
              <span className="boletin-stat-label">Desaprobadas</span>
            </div>
            <div className="boletin-stat boletin-stat--inas">
              <span className="boletin-stat-valor">{totalInas}</span>
              <span className="boletin-stat-label">Inasistencias</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sh-card">
        <div className="sh-card-title">
          <BookOpen size={18} /> Boletín de Calificaciones
        </div>

        <div className="boletin-wrapper">
          <table className="boletin-table">
            <thead className="boletin-thead">
              <tr>
                <th className="boletin-th">Período / Materias</th>
                {notasArr.map((m, i) => (
                  <th key={i} className="boletin-th">{m.materia_nombre}</th>
                ))}
                <th className="boletin-th" style={{ background: '#b45309' }}>Inasist.</th>
              </tr>
            </thead>
            <tbody>
              {FILAS.map(fila => <tr key={fila.id} className={`boletin-tr ${fila.id === 'def' ? 'boletin-tr--def' : ''}`}>
                  <td className="boletin-td">{fila.label}</td>
                  {notasArr.map((m, mi) => {
    const val = getValor(m, fila.id);
    return <td key={mi} className="boletin-td">
                        {renderNota(val, fila.id === 'inasistencias')}
                      </td>;
  })}
                  <td className="boletin-td" style={{
    color: '#b45309',
    fontWeight: 700
  }}>
                    {fila.id === 'def' ? totalInas : ''}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>

        <div className="boletin-leyenda">
          <span className="boletin-leyenda-item">
            <span className="boletin-leyenda-dot boletin-leyenda-dot--alta" /> 8–10 Destacado
          </span>
          <span className="boletin-leyenda-item">
            <span className="boletin-leyenda-dot boletin-leyenda-dot--media" /> 6–7 Aprobado
          </span>
          <span className="boletin-leyenda-item">
            <span className="boletin-leyenda-dot boletin-leyenda-dot--baja" /> 1–5 Desaprobado
          </span>
        </div>

        <div className="intensificar-section">
          <h3><AlertTriangle size={17} style={{ color: '#d97706' }} /> Materias a Intensificar</h3>
          <table className="intensificar-table">
            <thead>
              <tr>
                <th>Materia</th>
                <th>Nota</th>
                <th>Inasistencias</th>
              </tr>
            </thead>
            <tbody>
              {intensificar.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontStyle: 'italic' }}>
                    No hay materias pendientes de intensificación
                  </td>
                </tr>
              ) : (
                intensificar.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{item.materia_nombre}</td>
                    <td>
                      <span className={`boletin-nota ${notaCls(item.definitiva)}`}>{item.definitiva}</span>
                    </td>
                    <td>{item.inasistencias}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
