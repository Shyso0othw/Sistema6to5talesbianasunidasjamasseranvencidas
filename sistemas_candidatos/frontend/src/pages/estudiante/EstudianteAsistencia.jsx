import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import './EstudianteModule.css'
import { ChevronLeft } from 'lucide-react'
import { fetchAsistencias } from '../../api/notas'
import { API_BASE } from '../../config'

const COLORS = ['#4a63e0', '#059669', '#d97706', '#dc2626', '#7c3aed', '#ec4899', '#0891b2']
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}` })

function pct(item) {
  if (!item.total) return 0
  return Math.round((item.presentes / item.total) * 100)
}

function statusCls(p) {
  if (p >= 80) return 'en-asist--ok'
  if (p >= 70) return 'en-asist--warn'
  return 'en-asist--crit'
}

export default function EstudianteAsistencia({ nombre }) {
  const [view, setView] = useState('main') // 'main' or 'activity'
  const [selectedMateria, setSelectedMateria] = useState(null)
  const [animatedPercentage, setAnimatedPercentage] = useState(0)
  const [displayNumber, setDisplayNumber] = useState(0)
  const [ASISTENCIA, setASISTENCIA] = useState([])
  const [registroDiario, setRegistroDiario] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchAsistencias(),
      apiFetch(`${API_BASE}/asistencias-diarias/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : [])
    ]).then(([asistencias, diarias]) => {
      const mapped = asistencias.map((a, i) => ({
        materia: a.materia_nombre,
        presentes: a.presentes,
        ausentes: a.ausentes,
        justificadas: a.justificadas,
        injustificadas: a.injustificadas,
        tardes: a.tardes,
        total: a.total,
        horaLlegada: null,
        color: COLORS[i % COLORS.length],
      }))
      setASISTENCIA(mapped)

      const mapeoDiarias = diarias.map(d => {
        let faltas = 0;
        if (d.estado === 'Ausente' || d.estado === 'Injustificada') faltas = 1;
        if (d.estado === 'Tarde' || d.estado === 'Media Falta') faltas = 0.5;

        return {
          fecha: d.fecha,
          estado: d.estado,
          faltas: faltas
        }
      });
      setRegistroDiario(mapeoDiarias);
    }).finally(() => setLoading(false))
  }, [])

  const totalPres = ASISTENCIA.reduce((s, a) => s + a.presentes, 0)
  const totalAus = ASISTENCIA.reduce((s, a) => s + a.ausentes, 0)
  const totalTar = ASISTENCIA.reduce((s, a) => s + a.tardes, 0)
  const totalClases = ASISTENCIA.reduce((s, a) => s + a.total, 0)
  const pctGeneral = totalClases > 0 ? Math.round((totalPres / totalClases) * 100) : 0

  const handleVerActividad = (materia) => {
    setSelectedMateria(materia)
    setAnimatedPercentage(0) // Reiniciar para la animación
    setDisplayNumber(0)
    setView('activity')
  }

  const handleBack = () => {
    setView('main')
    setSelectedMateria(null)
  }

  useEffect(() => {
    if (view === 'activity' && selectedMateria) {
      const targetPercentage = pct(selectedMateria)
      // Animar el progreso de 0 a targetPercentage
      const timer = setTimeout(() => {
        setAnimatedPercentage(targetPercentage)
      }, 100)

      // Animar el conteo de números

      const end = targetPercentage
      const duration = 1500 // 1.5 segundos
      const startTime = Date.now()

      const animateNumber = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        setDisplayNumber(Math.floor(easeOutCubic * end))

        if (progress < 1) {
          requestAnimationFrame(animateNumber)
        }
      }

      const numberTimer = setTimeout(() => {
        requestAnimationFrame(animateNumber)
      }, 100)

      return () => {
        clearTimeout(timer)
        clearTimeout(numberTimer)
      }
    }
  }, [view, selectedMateria])

  if (view === 'activity') {
    const materia = selectedMateria
    const percentage = pct(materia)
    const estado = percentage >= 80 ? 'Excelente' : percentage >= 70 ? 'Cuidado' : 'Crítico'
    const colorEstado = percentage >= 80 ? '#10b981' : percentage >= 70 ? '#f59e0b' : '#ef4444'

    return (
      <div className="sh-page" style={{ background: '#fafafa', padding: '24px', maxWidth: '1024px', margin: '0 auto' }}>
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', cursor: 'pointer' }} onClick={handleBack}>
            <ChevronLeft size={24} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>{materia.materia}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '32px' }}>
            {/* Circular Progress */}
            <div style={{
              position: 'relative',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={colorEstado}
                  strokeWidth="10"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 40}`,
                    strokeDashoffset: `${2 * Math.PI * 40 - (2 * Math.PI * 40 * animatedPercentage) / 100}`,
                    transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <span style={{ fontSize: '36px', fontWeight: 800, color: colorEstado }}>{displayNumber}%</span>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>{materia.presentes} / {materia.total} clases</div>
              </div>
            </div>

            {/* Estado Badge */}
            <div style={{
              background: `${colorEstado}22`,
              color: colorEstado,
              padding: '8px 24px',
              borderRadius: '9999px',
              fontWeight: 600,
              fontSize: '14px'
            }}>
              {estado}
            </div>

            {/* Stats Cards - sin botones */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '500px', marginTop: '16px' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Clases totales</div>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>{materia.total}</span>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Clases dictadas</div>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>{materia.total}</span>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '14px', color: '#ef4444', marginBottom: '8px' }}>Faltas</div>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>{materia.ausentes}</span>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Suspendidas</div>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>4</span>
              </div>
            </div>
          </div>
        </>
      </div>
    )
  }

  if (loading) return <p className="sh-empty-text" style={{ textAlign:'center', padding:'3rem' }}>Cargando asistencias...</p>

  return (
    <div className="sh-page" style={{ padding: '0' }}>
      <div style={{ padding: '24px' }}>
        <div className="sh-hero" style={{ marginBottom: '32px' }}>
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Asistencia</h2>
            <p className="sh-hero-subtitle">
              {nombre} · Presente en <strong>{pctGeneral}%</strong> de las clases
            </p>
          </div>
          <div className="sh-hero-actions">
            <div className="en-stat">
              <span className="en-stat-value">{totalPres}</span>
              <span className="en-stat-label">Presentes</span>
            </div>
            <div className="en-stat en-stat--danger">
              <span className="en-stat-value">{totalAus}</span>
              <span className="en-stat-label">Ausentes</span>
            </div>
            <div className="en-stat" style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
              <span className="en-stat-value">{totalTar}</span>
              <span className="en-stat-label">Tardes</span>
            </div>
          </div>
        </div>

        {/* Tabla 1: Registro Diario de Asistencias */}
        <div className="sh-card" style={{ marginBottom: '24px' }}>
          <h2 className="sh-card-title" style={{ marginBottom: '16px', textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#1e40af' }}>
            Registro Diario de Asistencias
          </h2>
          <div className="en-table-container">
            <table className="en-table" style={{ marginBottom: '0' }}>
            <thead className="en-thead">
              <tr className="en-tr">
                <th className="en-th">Fecha</th>
                <th className="en-th" style={{ textAlign: 'center' }}>Conteo de faltas</th>
                <th className="en-th" style={{ textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
              <tbody>
                {registroDiario.map((r, i) => (
                  <tr key={i} className="en-tr">
                    <td className="en-td" style={{ fontWeight: 500, paddingLeft: '32px' }}>
                      {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="en-td" style={{ textAlign: 'center', fontWeight: 600, color: r.faltas > 0 ? '#dc2626' : '#059669' }}>
                      {r.faltas}
                    </td>
                    <td className="en-td" style={{ textAlign: 'center' }}>
                      <span style={{
                        background: r.estado === 'Presente' ? '#10b981' : r.estado === 'Tarde' ? '#f59e0b' : '#ef4444',
                        color: 'white',
                        padding: '8px 24px',
                        borderRadius: '9999px',
                        fontSize: '14px',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        {r.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {registroDiario.length === 0 && (
                  <tr className="en-tr">
                    <td colSpan="3" className="en-td" style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                      No hay registros de asistencia diaria.
                    </td>
                  </tr>
                )}
              </tbody>
          </table>
          </div>
        </div>

        {/* Tabla 2: Asistencia por Materias (actualizada) */}
        <div className="sh-card">
          <h2 className="sh-card-title" style={{ marginBottom: '16px', textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#1e40af' }}>
            Asistencia por Materias
          </h2>
          <div className="en-table-container">
            <table className="en-table">
            <thead className="en-thead">
              <tr className="en-tr">
                <th className="en-th">Materia</th>
                <th className="en-th" style={{ textAlign: 'center' }}>Presentes</th>
                <th className="en-th" style={{ textAlign: 'center' }}>Ausentes</th>
                <th className="en-th" style={{ textAlign: 'center' }}>Justificadas</th>
                <th className="en-th" style={{ textAlign: 'center' }}>Injustificadas</th>
                <th className="en-th" style={{ textAlign: 'center' }}>Tardes</th>
                <th className="en-th" style={{ textAlign: 'center' }}>Hora Llegada</th>
                <th className="en-th">Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {ASISTENCIA.map((m, i) => {
                const p = pct(m)
                const cls = statusCls(p)
                return (
                  <tr key={i} className="en-tr">
                    <td className="en-td">
                      <div className="en-materia-cell">
                        <span className="en-materia-dot" style={{ background: m.color }} />
                        {m.materia}
                      </div>
                    </td>
                    <td className="en-td" style={{ textAlign: 'center', fontWeight: 600, color: '#059669' }}>{m.presentes}</td>
                    <td className="en-td" style={{ textAlign: 'center', fontWeight: 600, color: '#dc2626' }}>{m.ausentes}</td>
                    <td className="en-td" style={{ textAlign: 'center', fontWeight: 600, color: '#8b5cf6' }}>{m.justificadas}</td>
                    <td className="en-td" style={{ textAlign: 'center', fontWeight: 600, color: '#ef4444' }}>{m.injustificadas}</td>
                    <td className="en-td" style={{ textAlign: 'center', fontWeight: 600, color: '#d97706' }}>{m.tardes}</td>
                    <td className="en-td" style={{ textAlign: 'center', color: '#6b7280' }}>{m.horaLlegada || '—'}</td>
                    <td className="en-td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                          className="tooltip"
                          data-tooltip="Ver detalles completos de asistencia de esta materia"
                          onClick={() => handleVerActividad(m)}
                          style={{
                            border: '2px solid #1e40af',
                            color: '#1e40af',
                            background: 'white',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#1e40af11'}
                          onMouseOut={(e) => e.target.style.background = 'white'}
                        >
                          Ver actividad
                        </button>
                        <div style={{ flex: 1 }}>
                          <div className="en-asist-bar-track">
                            <div className={`en-asist-bar-fill ${cls}`} style={{ width: `${p}%` }} />
                          </div>
                          <span className="en-asist-pct" style={{ fontWeight: 600 }}>{p}%</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  )
}
