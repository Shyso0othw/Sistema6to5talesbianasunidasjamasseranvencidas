import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { BookOpen, Save, CheckCircle2, GraduationCap } from 'lucide-react'
import '../../shared.css'
import './DocentesDashboard.css'
import { API_BASE } from '../../config'

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${token}`,
})

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

const CAMPOS_BOLETIN = [
  { id: 'v1', label: 'Valorac. 1°C', short: 'V1' },
  { id: 'n1', label: 'Nota 1°C', short: 'N1' },
  { id: 'vi1', label: 'Val. Int. 1°C', short: 'VI1' },
  { id: 'i1', label: 'Intens. 1°C', short: 'I1' },
  { id: 'v2', label: 'Valorac. 2°C', short: 'V2' },
  { id: 'n2', label: 'Nota 2°C', short: 'N2' },
  { id: 'dic', label: 'Diciembre', short: 'DIC' },
  { id: 'mar', label: 'Marzo', short: 'MAR' },
]

function notaCls(valor) {
  if (valor === null || valor === undefined || valor === '') return ''
  if (Number(valor) >= 8) return 'boletin-input--alta'
  if (Number(valor) >= 6) return 'boletin-input--media'
  return 'boletin-input--baja'
}

function calcDefinitiva(notas) {
  const campos = ['v1','n1','v2','n2','dic','mar','i1','vi1']
  let sum = 0, count = 0
  for (const c of campos) {
    const v = notas[c]
    if (v !== '' && v !== null && v !== undefined && !isNaN(Number(v))) {
      sum += Number(v)
      count++
    }
  }
  if (count === 0) return null
  return Math.round((sum / count) * 10) / 10
}

export default function DocenteNotas() {
  const [cursoSeleccionado, setCursoSeleccionado] = useState('')
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('')
  const [notas, setNotas] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [cursos, setCursos] = useState([])
  const [alumnosData, setAlumnosData] = useState([])
  const [materias, setMaterias] = useState([])
  const [saving, setSaving] = useState(false)

  // Load teacher's assigned courses and subjects
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) return

    Promise.all([
      apiFetch(`${API_BASE}/mis-cursos/`, { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      apiFetch(`${API_BASE}/mis-materias/`, { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ])
      .then(async ([cursosData, materiasData]) => {
        const response = await apiFetch(`${API_BASE}/alumnos/`, {headers: authHeaders(token)})
        if (!response.ok) throw new Error('No se pudieron cargar los alumnos.')
        setAlumnosData(await response.json())
        const mapped = (cursosData || []).map(item => ({
          id: item.id,
          nombre: `${item.año}° ${item.division}`,
          año: item.año,
          division: item.division
        }))
        setCursos(mapped)
        setMaterias(materiasData || [])
      })
      .catch((err) => console.error('Error cargando iniciales:', err))
  }, [])

  const materiasFiltradas = materias.filter(m => m.curso === Number(cursoSeleccionado))

  // Load messages when course or subject changes
  useEffect(() => {
    if (!cursoSeleccionado || !materiaSeleccionada) return

    const cursoObj = cursos.find(c => c.id === Number(cursoSeleccionado))
    if (!cursoObj) return

    const alumnosCurso = alumnosData.filter(a => a.año === cursoObj.año && a.division === cursoObj.division)

    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) return

    const loadNotas = async () => {
      try {
        const res = await apiFetch(`${API_BASE}/notas/?materia=${materiaSeleccionada}`, { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } })
        const notasExistentes = await res.json()
        let initialNotas = []
        alumnosCurso.forEach(function(a) {
          const notaObj = (notasExistentes || []).find(n => n.estudiante === a.id)
          initialNotas.push({
            id: notaObj ? notaObj.id : null,
            legajo: a.id,
            nombre: a.nombre + ' ' + a.apellido,
            notas: {
              v1: notaObj?.v1 ?? '',
              n1: notaObj?.n1 ?? '',
              vi1: notaObj?.vi1 ?? '',
              i1: notaObj?.i1 ?? '',
              v2: notaObj?.v2 ?? '',
              n2: notaObj?.n2 ?? '',
              dic: notaObj?.dic ?? '',
              mar: notaObj?.mar ?? '',
            }
          })
        })
        setNotas(initialNotas)
      } catch (err) {
        setNotas([])
        setMensaje('Error al cargar las notas: ' + err.message)
      }
    }
    loadNotas()
    return undefined
  }, [cursoSeleccionado, materiaSeleccionada, alumnosData, cursos])

  const handleCursoChange = (e) => {
    setCursoSeleccionado(Number(e.target.value))
    setMateriaSeleccionada('')
    setNotas([])
    setMensaje('')
  }

  const handleMateriaChange = (e) => {
    setMateriaSeleccionada(Number(e.target.value))
    setMensaje('')
  }

  const handleCambio = (idx, campo, valor) => {
    setNotas(prev => {
      const next = [...prev]
      if (campo === 'inasistencias') {
        next[idx].notas = { ...next[idx].notas, [campo]: valor === '' ? 0 : Math.max(0, Number(valor)) }
      } else {
        const num = valor === '' ? '' : Math.min(10, Math.max(1, Number(valor.replace(',', '.'))))
        next[idx].notas = { ...next[idx].notas, [campo]: num }
      }
      return next
    })
  }

  const handleGuardar = async () => {
    if (!materiaSeleccionada || saving) return
    setSaving(true)
    setMensaje('')

    try {
      const promises = notas.map(async (student) => {
        const body = {
          estudiante: student.legajo,
          materia: Number(materiaSeleccionada),
          v1: student.notas.v1 === '' ? null : Number(student.notas.v1),
          n1: student.notas.n1 === '' ? null : Number(student.notas.n1),
          vi1: student.notas.vi1 === '' ? null : Number(student.notas.vi1),
          i1: student.notas.i1 === '' ? null : Number(student.notas.i1),
          v2: student.notas.v2 === '' ? null : Number(student.notas.v2),
          n2: student.notas.n2 === '' ? null : Number(student.notas.n2),
          dic: student.notas.dic === '' ? null : Number(student.notas.dic),
          mar: student.notas.mar === '' ? null : Number(student.notas.mar),
        }

        if (student.id) {
          return apiFetch(`${API_BASE}/notas/${student.id}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify(body)
          }).then(r => r.ok ? r.json() : Promise.reject('Error updating note'))
        } else {
          return apiFetch(`${API_BASE}/notas/`, {
            method: 'POST',
            headers: authHeaders(getToken()),
            body: JSON.stringify(body)
          }).then(r => r.ok ? r.json() : Promise.reject('Error creating note'))
        }
      })

      const results = await Promise.all(promises)
      setMensaje('Calificaciones guardadas exitosamente en la base de datos.')

      setNotas(prev =>
        prev.map((item, idx) => ({
          ...item,
          id: results[idx]?.id || item.id
        }))
      )

      setMensaje('Calificaciones guardadas exitosamente en la base de datos.')
      setTimeout(() => setMensaje(''), 4000)
    } catch (err) {
      console.error(err)
      setMensaje('Ocurrió un error al guardar las calificaciones.')
    } finally {
      setSaving(false)
    }
  }

  const curso = cursos.find(c => c.id === cursoSeleccionado)

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Carga de Notas — Boletín</h2>
          <p className="sh-hero-subtitle">
            Ingrese las calificaciones por período para cada alumno
          </p>
        </div>
      </div>

      <div className="sh-card" style={{ marginBottom: 24 }}>
        <div className="sh-card-title">
          <BookOpen size={17} /> Seleccionar Curso y Materia
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="sh-filter-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="sh-filter-label">Curso</label>
            <select className="sh-select" value={cursoSeleccionado} onChange={handleCursoChange}>
              <option value="">Seleccione un curso...</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="sh-filter-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="sh-filter-label">Materia</label>
            <select className="sh-select" value={materiaSeleccionada} onChange={handleMateriaChange} disabled={!cursoSeleccionado}>
              <option value="">Seleccione una materia...</option>
              {materiasFiltradas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {mensaje && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
          background: mensaje.includes('error') ? '#fef2f2' : '#ecfdf5',
          border: mensaje.includes('error') ? '1px solid #fca5a5' : '1px solid #86efac',
          borderRadius: 10,
          marginBottom: 20,
          color: mensaje.includes('error') ? '#991b1b' : '#166534',
          fontWeight: 600, fontSize: 14
        }}>
          <CheckCircle2 size={18} />
          {mensaje}
        </div>
      )}

      {cursoSeleccionado && materiaSeleccionada && (
        <div className="sh-card">
          <div className="sh-card-title">
            <GraduationCap size={18} /> {curso?.nombre} — {materias.find(m => m.id === materiaSeleccionada)?.nombre}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 16 }}>
            {notas.length} alumnos · Notas de 1 a 10
          </p>

          <div className="boletin-wrapper">
            <table className="boletin-table">
              <thead className="boletin-thead">
                <tr>
                  <th className="boletin-th" style={{ minWidth: 160 }}>Alumno</th>
                  {CAMPOS_BOLETIN.map(c => (
                    <th key={c.id} className="boletin-th" title={c.label}>{c.short}</th>
                  ))}
                  <th className="boletin-th" style={{ background: 'var(--accent-blue)' }}>Definitiva</th>
                </tr>
              </thead>
              <tbody>
                {notas.map((a, i) => {
                  const def = calcDefinitiva(a.notas)
                  return (
                    <tr key={a.legajo} className="boletin-tr">
                      <td className="boletin-td" style={{ fontWeight: 600, textAlign: 'left' }}>{a.nombre}</td>
                      {CAMPOS_BOLETIN.map(c => (
                        <td key={c.id} className="boletin-td">
                          <input
                            type="number"
                            min={c.id === 'inasistencias' ? "0" : "1"}
                            max={c.id === 'inasistencias' ? "999" : "10"}
                            className={`boletin-input ${c.id === 'inasistencias' ? '' : notaCls(a.notas[c.id])}`}
                            value={a.notas[c.id]}
                            onChange={(e) => handleCambio(i, c.id, e.target.value)}
                            title={c.label}
                          />
                        </td>
                      ))}
                      <td className="boletin-td">
                        {def !== null ? (
                          <span className={`boletin-nota ${notaCls(def)}`}>{def}</span>
                        ) : (
                          <span className="boletin-nota boletin-nota--empty">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="sh-btn-primary" onClick={handleGuardar} disabled={saving}>
              <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Notas'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}