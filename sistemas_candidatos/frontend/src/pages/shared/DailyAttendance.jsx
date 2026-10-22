import { useEffect, useState, useRef } from 'react'
import { apiFetch } from '../../api/http'

async function read(url) {
  const response = await apiFetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar la asistencia (${response.status}).`)
  return response.json()
}

export function AttendanceHistory({ studentId }) {
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')
  const [month, setMonth] = useState('')
  useEffect(() => {
    let active = true
    read(`/api/asistencias-diarias/${studentId ? `?estudiante=${studentId}` : ''}`)
      .then(data => { if (active) { setRecords(data); setError('') } })
      .catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [studentId])
  const visible = records.filter(row => !month || row.fecha.startsWith(month))
  const absences = visible.reduce((sum,row) => sum + (row.estado === 'Ausente' ? 1 : row.estado === 'Media Falta' ? 0.5 : 0), 0)
  return <section className="sh-card">
    <h2>Registro diario de asistencia</h2>
    <label>Mes <input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>
    <p>Inasistencias del período: {absences}</p>
    {error && <p role="alert">{error}</p>}
    <div style={{overflowX:'auto'}}><table className="sh-table"><thead><tr><th>Fecha</th><th>Estudiante</th><th>Estado</th></tr></thead>
      <tbody>{visible.map(row => <tr key={row.id}><td>{row.fecha}</td><td>{row.estudiante_nombre}</td><td>{row.estado === 'Media Falta' ? 'Mitad de falta' : row.estado}</td></tr>)}</tbody>
    </table></div>
    {!visible.length && !error && <p>No hay registros para este período.</p>}
  </section>
}

export default function DailyAttendance() {
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [courseId, setCourseId] = useState('')
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [states, setStates] = useState({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  useEffect(() => {
    let active = true
    Promise.all([read('/api/cursos/'), read('/api/alumnos/')])
      .then(([c,s]) => { if(active) { setCourses(c); setStudents(s) } })
      .catch(error => { if(active) setMessage(error.message) })
    return () => {active = false}
  }, [])
  useEffect(() => {
    let active = true
    read(`/api/asistencias-diarias/?fecha=${date}`).then(rows => {
      if(active) setStates(Object.fromEntries(rows.map(row => [row.estudiante, row.estado])))
    }).catch(error => {if(active) setMessage(error.message)})
    return () => {active=false}
  }, [date])
  const course = courses.find(c => c.id === Number(courseId))
  const rows = students.filter(s => s.año === course?.año && s.division === course?.division)
  async function save() {
    if(lock.current || !rows.length) return
    lock.current=true
    setSaving(true)
    setMessage('')
    let done=0
    try {
      for(const student of rows) {
        const response=await apiFetch('/api/asistencias-diarias/', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({estudiante:student.id,fecha:date,estado:states[student.id] || 'Presente'})})
        if(!response.ok) throw new Error(JSON.stringify(await response.json()))
        done++
      }
      setMessage(`${done} asistencias guardadas.`)
    } catch(error) { setMessage(`${done} guardadas; no se completó el resto. ${error.message}`) }
    finally {lock.current=false;setSaving(false)}
  }
  return <div className="sh-page"><h2>Asistencia diaria</h2>
    <section className="sh-card">
      <label>Curso <select aria-label="Curso" value={courseId} disabled={saving} onChange={e => setCourseId(e.target.value)}><option value="">Seleccionar curso</option>{courses.map(c => <option key={c.id} value={c.id}>{c.año}° {c.division}</option>)}</select></label>
      <label>Fecha <input type="date" value={date} disabled={saving} onChange={e => setDate(e.target.value)} /></label>
      <div style={{overflowX:'auto'}}><table className="sh-table"><thead><tr><th>Estudiante</th><th>Asistencia</th></tr></thead><tbody>{rows.map(student => <tr key={student.id}><td>{student.apellido}, {student.nombre}</td><td><select aria-label={`Asistencia de ${student.nombre}`} disabled={saving} value={states[student.id] || 'Presente'} onChange={e => setStates({...states,[student.id]:e.target.value})}><option>Presente</option><option>Ausente</option><option value="Media Falta">Mitad de falta</option><option>Justificado</option></select></td></tr>)}</tbody></table></div>
      <button type="button" className="sh-btn-primary" disabled={saving || !rows.length || !date} onClick={save}>{saving ? 'Guardando…' : 'Guardar asistencia'}</button>
      {message && <p role="status">{message}</p>}
    </section>
  </div>
}
