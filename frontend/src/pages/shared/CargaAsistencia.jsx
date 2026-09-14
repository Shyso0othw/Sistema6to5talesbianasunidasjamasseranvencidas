import { apiFetch } from '../../api/http.js'
import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, Save, CheckCircle2, GraduationCap, AlertCircle } from 'lucide-react'
import { API_BASE } from '../../config'
import { fetchAsistencias, createAsistencia, updateAsistencia } from '../../api/notas'
import '../../shared.css'
import '../docente/DocentesDashboard.css'

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || ""
const authHeaders = () => {
  const t = getToken()
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

export default function CargaAsistencia() {
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
      const asistencias = await fetchAsistencias()
      const asisFiltradas = asistencias.filter(a => a.materia === Number(materiaId))

      const r = filtered.map(alumno => {
        const existente = asisFiltradas.find(a => a.estudiante === alumno.id)
        return {
          id: existente?.id || null,
          estudiante: alumno.id,
          estudiante_nombre: `${alumno.apellido}, ${alumno.nombre}`,
          materia: Number(materiaId),
          presentes: existente?.presentes ?? 0,
          ausentes: existente?.ausentes ?? 0,
          justificadas: existente?.justificadas ?? 0,
          injustificadas: existente?.injustificadas ?? 0,
          tardes: existente?.tardes ?? 0,
          total: existente?.total ?? 0,
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

  const handleCambio = (idx, campo, valor) => {
    const num = Math.max(0, Number(valor) || 0)
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [campo]: num }
      return next
    })
  }

  const handleGuardar = async () => {
    setMensaje(null)
    let ok = 0, err = 0
    for (const row of rows) {
      try {
        const payload = {
          estudiante: row.estudiante,
          materia: row.materia,
          presentes: Number(row.presentes) || 0,
          ausentes: Number(row.ausentes) || 0,
          justificadas: Number(row.justificadas) || 0,
          injustificadas: Number(row.injustificadas) || 0,
          tardes: Number(row.tardes) || 0,
          total: Number(row.total) || 0,
        }
        if (row.id) {
          await updateAsistencia(row.id, payload)
        } else {
          await createAsistencia(payload)
        }
        ok++
      } catch {
  err++;
}
    }
    if (err === 0) {
      setMensaje({ tipo: 'exito', texto: `Asistencias guardadas correctamente (${ok} alumnos).` })
    } else {
      setMensaje({ tipo: 'error', texto: `Guardadas: ${ok}, Errores: ${err}.` })
    }
    loadData()
  }

  const cursoSeleccionado = cursos.find(c => c.id === Number(cursoId))
  const materiaSeleccionada = materias.find(m => m.id === Number(materiaId))

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Carga de Asistencia</h2>
          <p className="sh-hero-subtitle">Registre la asistencia acumulada por materia para cada alumno</p>
        </div>
      </div>

      <div className="sh-card" style={{ marginBottom: 24 }}>
        <div className="sh-card-title">
          <ClipboardCheck size={17} /> Seleccionar Curso y Materia
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
          <p style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 16 }}>
            {rows.length} alumnos
          </p>
          <table className="en-table">
            <thead className="en-thead">
              <tr className="en-tr">
                <th className="en-th" style={{ minWidth: 160 }}>Alumno</th>
                <th className="en-th">Presentes</th>
                <th className="en-th">Ausentes</th>
                <th className="en-th">Justificadas</th>
                <th className="en-th">Injustificadas</th>
                <th className="en-th">Tardes</th>
                <th className="en-th">Total Clases</th>
                <th className="en-th" style={{ background: 'var(--accent-blue)' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => {
                const pct = a.total > 0 ? Math.round((a.presentes / a.total) * 100) : 0
                return (
                  <tr key={a.estudiante} className="en-tr">
                    <td className="en-td" style={{ fontWeight: 600, textAlign: 'left' }}>{a.estudiante_nombre}</td>
                    {['presentes','ausentes','justificadas','injustificadas','tardes','total'].map(campo => (
                      <td key={campo} className="en-td">
                        <input
                          type="number"
                          min="0"
                          className="sh-input"
                          style={{ width: 70, padding: '6px 8px', textAlign: 'center' }}
                          value={a[campo]}
                          onChange={(e) => handleCambio(i, campo, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="en-td" style={{ fontWeight: 700, color: pct >= 80 ? '#166534' : pct >= 70 ? '#92400e' : '#991b1b' }}>
                      {pct}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="sh-btn-primary" onClick={handleGuardar}>
              <Save size={16} /> Guardar Asistencias
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
