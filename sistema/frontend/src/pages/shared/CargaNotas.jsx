import { apiFetch } from '../../api/http.js'
import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Save, CheckCircle2, GraduationCap, AlertCircle } from 'lucide-react'
import { API_BASE } from '../../config'
import { fetchNotas, createNota, updateNota } from '../../api/notas'
import '../../shared.css'
import '../docente/DocentesDashboard.css'

const CAMPOS_BOLETIN = [
  { id: 'v1', label: '1er Informe', short: '1I' },
  { id: 'n1', label: '1er Cuat', short: '1C' },
  { id: 'vi1', label: '1er Informe Virtual', short: '1VI' },
  { id: 'i1', label: 'Intensificación 1° C.', short: '1I' },
  { id: 'v2', label: '2do Informe', short: '2I' },
  { id: 'n2', label: '2do Cuat', short: '2C' },
  { id: 'dic', label: 'Dic', short: 'DIC' },
  { id: 'feb', label: 'Feb', short: 'FEB' },
  { id: 'mar', label: 'Mar', short: 'MAR' },
  { id: 'nota_final', label: 'Nota Final', short: 'FIN' },
]

const CAMPOS_NUMERICOS = ['v1', 'n1', 'vi1', 'i1', 'v2', 'n2', 'dic', 'feb', 'mar']

function calcularNotaFinal(row) {
  const n1 = row.n1 === '' || row.n1 === null ? null : Number(row.n1)
  const n2 = row.n2 === '' || row.n2 === null ? null : Number(row.n2)
  if (n1 === null || n2 === null) return ''
  const i1 = row.i1 === '' || row.i1 === null ? null : Number(row.i1)
  const dic = row.dic === '' || row.dic === null ? null : Number(row.dic)
  const feb = row.feb === '' || row.feb === null ? null : Number(row.feb)
  const mar = row.mar === '' || row.mar === null ? null : Number(row.mar)

  let a = n1, b = n2

  if (a < 7 && i1 !== null) a = i1
  if (a < 7 && dic !== null) a = dic
  if (a < 7 && feb !== null) a = feb
  if (a < 7 && mar !== null) a = mar

  if (b < 7 && dic !== null) b = dic
  if (b < 7 && feb !== null) b = feb
  if (b < 7 && mar !== null) b = mar

  return Math.round((a + b) / 2)
}

function notaCls(valor) {
  if (valor === null || valor === undefined || valor === '') return ''
  if (Number(valor) >= 8) return 'boletin-input--alta'
  if (Number(valor) >= 6) return 'boletin-input--media'
  return 'boletin-input--baja'
}


const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || ""
const authHeaders = () => {
  const t = getToken()
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

export default function CargaNotas() {
  const [cursos, setCursos] = useState([])
  const [materias, setMaterias] = useState([])
  const [cursoId, setCursoId] = useState('')
  const [materiaId, setMateriaId] = useState('')
  const [rows, setRows] = useState([])
  const [mensaje, setMensaje] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setCursos)
      .catch(() => {})
    apiFetch(`${API_BASE}/materias/`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setMaterias)
      .catch(() => {})
  }, [])

  const loadData = useCallback(() => {
    if (!cursoId || !materiaId) return
    const fetchRows = async () => {
      const curso = cursos.find(c => c.id === Number(cursoId))
      const alumnos = await apiFetch(`${API_BASE}/alumnos/`, { headers: authHeaders() }).then(r => r.json())
      const filtered = alumnos.filter(a => a.año === curso?.año && a.division === curso?.division)
      const notas = await fetchNotas()
      const materiasList = await apiFetch(`${API_BASE}/materias/`, { headers: authHeaders() }).then(r => r.json())
      const materia = materiasList.find(m => m.id === Number(materiaId))
      if (!materia) throw new Error('Materia no disponible')
      const notasFiltradas = notas.filter(n => n.materia === Number(materiaId))

      const r = filtered.map(alumno => {
        const existente = notasFiltradas.find(n => n.estudiante === alumno.id)
        return {
          id: existente?.id || null,
          estudiante: alumno.id,
          estudiante_nombre: `${alumno.apellido}, ${alumno.nombre}`,
          materia: Number(materiaId),
          materia_nombre: materia.nombre,
          v1: existente?.v1 ?? '',
          n1: existente?.n1 ?? '',
          vi1: existente?.vi1 ?? '',
          i1: existente?.i1 ?? '',
          v2: existente?.v2 ?? '',
          n2: existente?.n2 ?? '',
          dic: existente?.dic ?? '',
          feb: existente?.feb ?? '',
          mar: existente?.mar ?? '',
          nota_final: '',
        }
      })
      return r
    }
    return fetchRows().then(setRows).catch(error => {
      setRows([])
      setMensaje({tipo:'error', texto:'Error al cargar datos: ' + error.message})
    }).finally(() => setLoading(false))
  }, [cursoId, materiaId, cursos])

  useEffect(() => { loadData() }, [loadData])

  const handleCellChange = (estudianteId, campo, valor) => {
    if (campo === 'nota_final') return
    setRows(prev => prev.map(row => {
      if (row.estudiante !== estudianteId) return row
      const isNota = CAMPOS_NUMERICOS.includes(campo)
      let finalValue = valor
      if (isNota) {
        finalValue = valor === '' ? '' : valor.replace(',', '.').replace(/[^0-9.]/g, '')
        if (finalValue !== '' && parseFloat(finalValue) > 10) finalValue = '10'
      }
      const updated = { ...row, [campo]: finalValue }
      if (['n1', 'n2', 'i1', 'dic', 'feb', 'mar'].includes(campo)) {
        updated.nota_final = calcularNotaFinal(updated)
      }
      return updated
    }))
  }

  const hasData = (row) => CAMPOS_BOLETIN.some(c => row[c.id] !== '' && row[c.id] !== null && row[c.id] !== undefined)

  const handleGuardar = async () => {
    setMensaje(null)
    let ok = 0, err = 0, skipped = 0
    for (const row of rows) {
      if (!hasData(row) && !row.id) { skipped++; continue }
      try {
        const payload = {
          estudiante: row.estudiante,
          materia: row.materia,
          v1: row.v1,
          n1: row.n1 === '' ? null : Number(row.n1),
          vi1: row.vi1 === '' ? null : Number(row.vi1),
          i1: row.i1 === '' ? null : Number(row.i1),
          v2: row.v2,
          n2: row.n2 === '' ? null : Number(row.n2),
          dic: row.dic === '' ? null : Number(row.dic),
          feb: row.feb === '' ? null : Number(row.feb),
          mar: row.mar === '' ? null : Number(row.mar),
          nota_final: row.nota_final === '' ? null : Number(row.nota_final),
        }
        if (row.id) {
          await updateNota(row.id, payload)
        } else {
          await createNota(payload)
        }
        ok++
      } catch {
  err++;
}
    }
    const partes = []
    if (ok) partes.push(`${ok} guardadas`)
    if (skipped) partes.push(`${skipped} sin datos (omitidas)`)
    if (err) partes.push(`${err} errores`)
    setMensaje({ tipo: err === 0 ? 'exito' : 'error', texto: `Resultado: ${partes.join(', ')}.` })
    loadData()
  }

  const cursoSeleccionado = cursos.find(c => c.id === Number(cursoId))
  const materiaSeleccionada = materias.find(m => m.id === Number(materiaId))

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Carga de Notas — Boletín</h2>
          <p className="sh-hero-subtitle">Ingrese las calificaciones por período para cada alumno</p>
        </div>
      </div>

      <div className="sh-card" style={{ marginBottom: 24 }}>
        <div className="sh-card-title">
          <BookOpen size={17} /> Seleccionar Curso y Materia
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="sh-filter-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="sh-filter-label">Curso</label>
            <select className="sh-select" value={cursoId} onChange={e => { setCursoId(e.target.value); setMateriaId('') }}>
              <option value="">Seleccione un curso...</option>
              {cursos.map(c => (
                <option key={c.id} value={c.id}>{c.año}° {c.division}</option>
              ))}
            </select>
          </div>
          <div className="sh-filter-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="sh-filter-label">Materia</label>
            <select className="sh-select" value={materiaId} onChange={e => {setLoading(true);setRows([]);setMensaje(null);setMateriaId(e.target.value)}}>
              <option value="">Seleccione una materia...</option>
              {materias
                .filter(m => !cursoId || m.curso === Number(cursoId))
                .map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {mensaje && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
          background: mensaje.tipo === 'exito' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${mensaje.tipo === 'exito' ? '#86efac' : '#fca5a5'}`,
          borderRadius: 10, marginBottom: 20,
          color: mensaje.tipo === 'exito' ? '#166534' : '#991b1b',
          fontWeight: 600, fontSize: 14
        }}>
          {mensaje.tipo === 'exito' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {mensaje.texto}
        </div>
      )}

      {loading && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-soft)' }}>Cargando alumnos...</p>}

      {!loading && cursoId && materiaId && rows.length > 0 && (
        <div className="sh-card">
          <div className="sh-card-title">
            <GraduationCap size={18} /> {cursoSeleccionado?.año}° {cursoSeleccionado?.division} — {materiaSeleccionada?.nombre}
          </div>

          <div className="boletin-wrapper">
            <table className="boletin-table">
              <thead className="boletin-thead">
                <tr>
                  <th className="boletin-th" style={{ minWidth: 160 }}>Alumno</th>
                  {CAMPOS_BOLETIN.map(c => (
                    <th key={c.id} className="boletin-th-field" title={c.label}>{c.short}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.estudiante} className="boletin-tr">
                    <td className="boletin-td" style={{ fontWeight: 600, textAlign: 'left' }}>{a.estudiante_nombre}</td>
                    {CAMPOS_BOLETIN.map(c => {
                      const val = a[c.id]
                      const isN = CAMPOS_NUMERICOS.includes(c.id)
                      if (c.id === 'nota_final') {
                        return (
                          <td key={c.id} className="boletin-td-field">
                            <span className={`boletin-input ${val !== '' && val !== null && val !== undefined ? notaCls(val) : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontWeight: 700 }}>
                              {val !== '' && val !== null && val !== undefined ? val : '—'}
                            </span>
                          </td>
                        )
                      }
                      return (
                        <td key={c.id} className="boletin-td-field">
                          <input
                            type="text"
                            className={`boletin-input ${isN ? notaCls(val) : ''}`}
                            value={val}
                            onChange={(e) => handleCellChange(a.estudiante, c.id, e.target.value)}
                            onBlur={(e) => {
                              if (isN) {
                                const v = parseFloat(e.target.value)
                                if (!isNaN(v) && v > 10) {
                                  handleCellChange(a.estudiante, c.id, '10')
                                }
                              }
                            }}
                            title={c.label}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="sh-btn-primary" onClick={handleGuardar}>
              <Save size={16} /> Guardar Notas
            </button>
          </div>
        </div>
      )}

      {!loading && cursoId && materiaId && rows.length === 0 && (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-soft)' }}>No hay alumnos en este curso.</p>
      )}
    </div>
  )
}
