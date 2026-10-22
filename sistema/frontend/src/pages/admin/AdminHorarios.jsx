import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { Search, Calendar, Plus, Save, Trash2, X, Edit3, Printer } from 'lucide-react'
import { API_BASE } from '../../config'
import { getFranjas, getCiclo } from '../../utils/horarioUtils';
import HorarioGrid from '../../components/specific/HorarioGrid'
import { exportHorariosCSV } from '../../utils/exportUtils'
import { hasPermission } from '../../utils/permissions'
import '../../shared.css'
import './AdminDashboard.css'
import '../estudiante/EstudianteModule.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

const DIAS_COMPLETO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const DIAS_OPTIONS = DIAS_COMPLETO.map((nombre, idx) => ({ value: idx, label: nombre }))
const FRANJA_OPTIONS = Array.from({ length: 14 }, (_, i) => i)

const COLOR_PALETTE = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#fce7f3', color: '#be185d' },
  { bg: '#fef9c3', color: '#a16207' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#f3e8ff', color: '#7c3aed' },
  { bg: '#fef3c7', color: '#b45309' },
  { bg: '#f0fdfa', color: '#0f766e' },
  { bg: '#ede9fe', color: '#6d28d9' },
  { bg: '#fce7f3', color: '#db2777' },
  { bg: '#d1fae5', color: '#047857' },
]

function buildMateriaColors(nombres) {
  const colors = {}
  nombres.forEach((nombre, i) => {
    const palette = COLOR_PALETTE[i % COLOR_PALETTE.length]
    colors[nombre] = { bg: palette.bg, color: palette.color }
  })
  return colors
}

export default function AdminHorarios() {
  const [horarios, setHorarios] = useState([])
  const [cursos, setCursos] = useState([])
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtroCurso, setFiltroCurso] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ curso: '', materia: '', dia: 0, franja: 0, aula: '', profesor_nombre: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const loadData = () => {
    Promise.all([
      apiFetch(`${API_BASE}/horarios/`, { headers: authHeaders() }).then(r => r.json()),
      apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() }).then(r => r.json()),
      apiFetch(`${API_BASE}/materias/`, { headers: authHeaders() }).then(r => r.json()),
    ])
      .then(([horariosData, cursosData, materiasData]) => {
        setCursos(cursosData)
        setMaterias(materiasData)

        const cmap = {}
        cursosData.forEach(c => { cmap[c.id] = c })
        const mmap = {}
        materiasData.forEach(m => { mmap[m.id] = m })

        const mapped = horariosData.map(item => ({
          id: item.id,
          dia: item.dia,
          franja: item.franja,
          materia: mmap[item.materia]?.nombre || `Materia #${item.materia}`,
          materia_id: item.materia,
          profesor: item.profesor_nombre || '-',
          aula: item.aula || '-',
          curso: cmap[item.curso] ? `${cmap[item.curso].año}°${cmap[item.curso].division}` : '-',
          curso_id: item.curso,
        }))
        setHorarios(mapped)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }

  useEffect(() => { loadData() }, [])

  const canManageHorarios = hasPermission('canManageHorarios')

  const resetForm = () => {
    setForm({ curso: '', materia: '', dia: 0, franja: 0, aula: '', profesor_nombre: '' })
    setEditingId(null)
    setShowForm(false)
    setFormError('')
  }

  const startEdit = (h) => {
    setForm({ curso: String(h.curso_id || ''), materia: String(h.materia_id || ''), dia: h.dia, franja: h.franja, aula: h.aula === '-' ? '' : h.aula, profesor_nombre: h.profesor === '-' ? '' : h.profesor })
    setEditingId(h.id)
    setShowForm(true)
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.curso || !form.materia) { setFormError('Curso y materia son obligatorios'); return }
    setSubmitting(true)
    const payload = {
      curso: Number(form.curso),
      materia: Number(form.materia),
      dia: Number(form.dia),
      franja: Number(form.franja),
      aula: form.aula,
      profesor_nombre: form.profesor_nombre,
    }
    try {
      const url = editingId ? `${API_BASE}/horarios/${editingId}/` : `${API_BASE}/horarios/`
      const method = editingId ? 'PATCH' : 'POST'
      const r = await apiFetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) })
      if (!r.ok) {
        let errorMsg = 'Error al guardar horario'
        try {
          const errData = await r.json()
          const messages = Object.values(errData).flat()
          if (messages.length > 0) errorMsg = messages.join('. ')
        } catch { errorMsg = `Error al guardar horario (${r.status})` }
        throw new Error(errorMsg)
      }
      resetForm()
      loadData()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este horario?')) return
    try {
      await apiFetch(`${API_BASE}/horarios/${id}/`, { method: 'DELETE', headers: authHeaders() })
      loadData()
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  const handleMoveHorario = async (id, dia, franja) => {
    try {
      const r = await apiFetch(`${API_BASE}/horarios/${id}/move/`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ dia, franja }) })
      const contentType = r.headers.get('content-type') || ''
      let bodyText = ''
      if (contentType.includes('application/json')) {
        const j = await r.json()
        bodyText = JSON.stringify(j)
      } else {
        bodyText = await r.text()
      }
      if (!r.ok) {
        console.error('Move horario failed', r.status, bodyText)
        throw new Error(bodyText || `Error ${r.status}`)
      }
      loadData()
    } catch (err) {
      console.error('Error in handleMoveHorario', err)
      alert('Error al mover horario: ' + (err.message || err))
    }
  }

  const handleExportPDF = () => {
    const containerId = filtroCurso ? 'export-container-grid' : 'export-container'
    const content = document.getElementById(containerId)
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Horarios</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; font-size: 14px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #333; padding: 10px; text-align: left; }
        th { background: #e0e0e0; font-weight: 700; font-size: 13px; }
        .en-horario-grid { font-family: Arial, sans-serif; }
        .en-horario-header { display: grid; grid-template-columns: 100px repeat(5, 1fr); background: #e0e0e0; font-weight: 700; font-size: 14px; }
        .en-horario-header-cell { padding: 12px; text-align: center; border: 1px solid #333; }
        .en-horario-row { display: grid; grid-template-columns: 100px repeat(5, 1fr); }
        .en-horario-time { padding: 12px; font-size: 12px; font-weight: 600; background: #f0f0f0; border: 1px solid #333; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .en-horario-time span { display: block; }
        .en-horario-cell { padding: 10px; border: 1px solid #333; min-height: 60px; }
        .en-horario-materia { font-size: 14px; font-weight: 700; display: block; margin-bottom: 4px; }
        .en-horario-profesor { font-size: 12px; display: block; }
        .en-horario-aula { font-size: 11px; display: block; margin-top: 4px; }
        .en-horario-cell--empty { color: #ccc; }
      </style></head><body>${content.innerHTML}</body></html>
    `)
    win.document.close()
    win.print()
  }

  const allMateriaNames = [...new Set(horarios.map(h => h.materia))]
  const MATERIA_COLORS = buildMateriaColors(allMateriaNames)

  const cursoOptions = cursos.map(c => ({ value: c.id, label: `${c.año}°${c.division}` }))
  const materiasFiltradas = form.curso
    ? materias.filter(m => m.curso === Number(form.curso))
    : materias

  const horariosFiltrados = filtroCurso
    ? horarios.filter(h => h.curso === filtroCurso)
    : horarios

  const ciclo = filtroCurso ? getCiclo(filtroCurso) : 'basico'
  const franjas = getFranjas(ciclo)

  if (loading) {
    return (
      <div className="sh-page">
        <div className="sh-hero">
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Gestión de Horarios</h2>
            <p className="sh-hero-subtitle">Cargando horarios...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sh-page">
        <div className="sh-hero">
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Gestión de Horarios</h2>
            <p className="sh-hero-subtitle" style={{ color: '#dc2626' }}>Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e0e0e0',
    fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff',
  }

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Gestión de Horarios</h2>
          <p className="sh-hero-subtitle">{horarios.length} horarios registrados · Ciclo Lectivo 2026</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid" style={{ gridTemplateColumns: '1fr auto' }}>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Filtrar por curso</label>
            <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} className="sh-select">
              <option value="">Todos los cursos</option>
              {cursoOptions.map(c => (
                <option key={c.value} value={c.label}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sh-filter-group" style={{ alignSelf: 'flex-end', display: 'flex', gap: '8px' }}>
            <button onClick={() => exportHorariosCSV(horariosFiltrados, franjas, DIAS_COMPLETO, `horarios_${filtroCurso || 'todos'}.csv`)} className="sh-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', color: '#333', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Exportar CSV
            </button>
            <button className="sh-btn-ghost" onClick={handleExportPDF} title="Exportar PDF" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', color: '#333', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Printer size={16} /> Exportar PDF
            </button>
            {canManageHorarios && (
              <button onClick={() => { resetForm(); setShowForm(!showForm) }} className="sh-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4a63e0', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={16} /> {showForm ? 'Cancelar' : 'Nuevo Horario'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showForm && canManageHorarios && (
        <div className="sh-card" style={{ marginBottom: 20 }}>
          <h3 className="sh-card-title"><Save size={16} /> {editingId ? 'Editar' : 'Nuevo'} Horario</h3>
          {formError && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{formError}</p>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Curso</label>
                <select value={form.curso} onChange={e => setForm({ ...form, curso: e.target.value, materia: '' })} style={inputStyle}>
                  <option value="">Seleccionar curso</option>
                  {cursoOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Materia</label>
                <select value={form.materia} onChange={e => setForm({ ...form, materia: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar materia</option>
                  {materiasFiltradas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Día</label>
                <select value={form.dia} onChange={e => setForm({ ...form, dia: Number(e.target.value) })} style={inputStyle}>
                  {DIAS_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Franja</label>
                <select value={form.franja} onChange={e => setForm({ ...form, franja: Number(e.target.value) })} style={inputStyle}>
                  {FRANJA_OPTIONS.map(i => (
                    <option key={i} value={i}>#{i} {franjas[i] ? `(${franjas[i].inicio}-${franjas[i].fin})` : ''}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Aula</label>
                <input value={form.aula} onChange={e => setForm({ ...form, aula: e.target.value })} placeholder="Ej: 101" style={inputStyle} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Profesor</label>
                <input value={form.profesor_nombre} onChange={e => setForm({ ...form, profesor_nombre: e.target.value })} placeholder="Nombre del profesor" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button type="submit" disabled={submitting} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6,
                border: 'none', background: '#4a63e0', color: '#fff', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1,
              }}>
                <Save size={15} /> {submitting ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={resetForm} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6,
                border: '1px solid #e0e0e0', background: '#fff', color: '#666', fontWeight: 500, fontSize: 13,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <X size={15} /> Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="sh-card">
        <h2 className="sh-card-title">
          <Calendar size={17} /> Horario Semanal
          {filtroCurso && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-soft)', marginLeft: 8 }}>— {filtroCurso}</span>}
        </h2>
        {filtroCurso ? (
          <div id="export-container-grid">
            <HorarioGrid
              franjas={franjas}
              horarios={horariosFiltrados}
              materiaColors={MATERIA_COLORS}
              onMove={handleMoveHorario}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          </div>
        ) : (
          <div className="sh-card">
            <p className="sh-empty-text">Seleccioná un curso para ver el horario semanal.</p>
          </div>
        )}
      </div>

      {!filtroCurso && (
        <div className="sh-card" id="export-container">
          <h3 className="sh-card-title">
            <Search size={17} /> Todos los horarios (vista tabla)
          </h3>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>CURSO</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>MATERIA</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>PROFESOR</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>DÍA</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>HORARIO</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>AULA</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {horarios.map((h, i) => (
                <tr key={h.id || i} style={{ background: '#fff', borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{h.curso}</td>
                  <td style={{ padding: '12px 16px' }}>{h.materia}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-soft)' }}>{h.profesor}</td>
                  <td style={{ padding: '12px 16px' }}>{DIAS_COMPLETO[h.dia]}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{franjas[h.franja]?.inicio || '-'} - {franjas[h.franja]?.fin || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{h.aula}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {canManageHorarios && (
                        <button onClick={() => startEdit(h)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a63e0', padding: 4, borderRadius: 4 }}>
                          <Edit3 size={15} />
                        </button>
                      )}
                      {canManageHorarios && (
                        <button onClick={() => handleDelete(h.id)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4, borderRadius: 4 }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
