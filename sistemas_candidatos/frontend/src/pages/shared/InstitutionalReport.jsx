import { useEffect, useState } from 'react'
import { apiFetch } from '../../api/http'

export default function InstitutionalReport() {
  const [stats,setStats]=useState(null)
  const [error,setError]=useState('')
  useEffect(() => {
    let active=true
    apiFetch('/api/dashboard/stats/').then(async response => {
      if(!response.ok) throw new Error('No se pudieron obtener los reportes.')
      const data=await response.json()
      if(active) setStats(data)
    }).catch(err => {if(active) setError(err.message)})
    return () => {active=false}
  },[])
  return <div className="sh-page"><h2>Reportes institucionales</h2>{error && <p role="alert">{error}</p>}
    {!stats && !error && <p>Cargando datos…</p>}
    {stats && <section className="sh-card"><dl>
      <dt>Estudiantes</dt><dd>{stats.total_alumnos}</dd><dt>Docentes</dt><dd>{stats.total_profesores}</dd>
      <dt>Cursos activos</dt><dd>{stats.total_cursos}</dd><dt>Asistencia registrada hoy</dt><dd>{stats.asistencia_hoy}</dd>
      <dt>Alumnos con más de diez ausencias registradas</dt><dd>{stats.alertas_count}</dd>
    </dl><h3>Estudiantes por orientación</h3>{stats.carreras.map(c => <p key={c.nombre}>{c.nombre}: {c.cantidad}</p>)}</section>}
  </div>
}
