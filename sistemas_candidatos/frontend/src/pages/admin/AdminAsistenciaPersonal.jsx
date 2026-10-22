import { apiFetch } from '../../api/http.js'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Filter, Save, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import '../../shared.css'
import './AdminDashboard.css'
import '../estudiante/EstudianteModule.css'

import { fetchContactos } from '../../api/chat'
import { API_BASE } from '../../config'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

const TURNO_OPTIONS = ['Mañana', 'Tarde', 'Vespertino']
const DIA_OPTIONS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes']
const CARGOS_OPTIONS = [
  "Directivo", "Secretaría", "Auxiliar", "Bibliotecario", "EOE", "EMATP",
  "Jefe de Preceptores", "Jefe de Área", "Jefe de Departamento", "Docente", "Preceptor"
]

export default function AdminAsistenciaPersonal() {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtroCargo, setFiltroCargo] = useState('')
  const [form, setForm] = useState({
    nombre: '', apellido: '', codigo: '', cargo: '',
    estado: 'Activo', motivo: '', turno: 'Mañana', dia: 'Lunes',
    hora_entrada: '', hora_salida: '', firma: false,
  })
  const [personalDb, setPersonalDb] = useState([])

  useEffect(() => {
    fetchContactos(getToken())
      .then(data => {
        const staff = data.filter(u => !['estudiante', 'familia'].includes(u.rol))
        setPersonalDb(staff)
      })
      .catch(() => {})
  }, [])

  const handlePersonalSelect = (e) => {
    const p = personalDb.find(x => x.id.toString() === e.target.value)
    if (p) {
      let c = 'Docente'
      const r = p.rol || ''
      if (r === 'docente') c = 'Docente'
      else if (r === 'preceptor') c = 'Preceptor'
      else if (r === 'staff' || r === 'admin') c = 'Directivo' 
      setForm(prev => ({
        ...prev,
        nombre: p.nombre || p.nombre_completo.split(' ')[0] || '',
        apellido: p.apellido || p.nombre_completo.split(' ').slice(1).join(' ') || '',
        codigo: p.cuil || p.dni || p.id.toString(),
        cargo: c
      }))
    }
  }

  const fetchRegistros = useCallback(() => {
    const url = filtroCargo
      ? `${API_BASE}/asistencia-personal/?cargo=${filtroCargo}`
      : `${API_BASE}/asistencia-personal/`
    apiFetch(url)
      .then(r => r.json())
      .then(d => { setRegistros(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filtroCargo])

  useEffect(() => { fetchRegistros() }, [fetchRegistros])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const r = await apiFetch(`${API_BASE}/asistencia-personal/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!r.ok) throw new Error('Error al guardar')
      setShowForm(false)
      setForm({ nombre: '', apellido: '', codigo: '', cargo: 'Docente', estado: 'Activo', motivo: '', turno: 'Mañana', dia: 'Lunes', hora_entrada: '', hora_salida: '', firma: false })
      fetchRegistros()
    } catch (err) { alert(err.message) }
  }

  const toggleFirma = (id, actual) => {
    apiFetch(`${API_BASE}/asistencia-personal/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firma: !actual })
    }).then(fetchRegistros).catch(() => {})
  }

  const eliminar = (id) => {
    if (window.confirm('¿Seguro que querés eliminar este registro?')) {
      apiFetch(`${API_BASE}/asistencia-personal/${id}/`, { method: 'DELETE' })
        .then(() => fetchRegistros())
        .catch(() => {})
    }
  }

  const getEstadoColor = (estado) => {
    if (estado === 'Activo') return '#059669'
    if (estado === 'Licencia') return '#d97706'
    return '#dc2626'
  }

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Asistencia del Personal</h2>
          <p className="sh-hero-subtitle">Registro de entrada/salida de todo el personal</p>
        </div>
      </div>

      <div className="sh-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)} className="agregar-alumno-select" style={{ width: 180 }}>
              <option value="">Todos los cargos</option>
              {CARGOS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="agregar-alumno-btn agregar-alumno-btn-primary" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> {showForm ? 'Cerrar' : 'Nuevo Registro'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="sh-card" style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            <Plus size={16} style={{ marginRight: 6 }} /> Nuevo Registro de Asistencia
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="en-perfil-field" style={{ marginBottom: 16 }}>
              <span className="en-perfil-field-label">Seleccionar personal de la Base de Datos (Opcional)</span>
              <select onChange={handlePersonalSelect} className="agregar-alumno-select" defaultValue="">
                <option value="" disabled>Seleccione un usuario...</option>
                {personalDb.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre_completo || p.username} ({p.rol})</option>
                ))}
              </select>
            </div>
            <div className="en-perfil-info-grid">
              <div className="en-perfil-field">
                <span className="en-perfil-field-label">Nombre</span>
                <input type="text" name="nombre" value={form.nombre} onChange={handleChange} className="agregar-alumno-input" required />
              </div>
              <div className="en-perfil-field">
                <span className="en-perfil-field-label">Apellido</span>
                <input type="text" name="apellido" value={form.apellido} onChange={handleChange} className="agregar-alumno-input" required />
              </div>
              <div className="en-perfil-field">
                <span className="en-perfil-field-label">Código</span>
                <input type="text" name="codigo" value={form.codigo} onChange={handleChange} className="agregar-alumno-input" required />
              </div>
              <div className="en-perfil-field">
                <span className="en-perfil-field-label">Cargo</span>
                <select name="cargo" value={form.cargo} onChange={handleChange} className="agregar-alumno-select" required>
                  <option value="">Seleccione cargo...</option>
                  {CARGOS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="en-perfil-field">
                <span className="en-perfil-field-label">Estado</span>
                <select name="estado" value={form.estado} onChange={handleChange} className="agregar-alumno-select">
                  <option value="Activo">Activo</option>
                  <option value="Licencia">Licencia</option>
                  <option value="Suspendido">Suspendido</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div className="en-perfil-field">
                <span className="en-perfil-field-label">Motivo</span>
                <input type="text" name="motivo" value={form.motivo} onChange={handleChange} className="agregar-alumno-input" placeholder="Motivo (si aplica)" />
              </div>
              <div className="en-perfil-field">
                <span className="en-perfil-field-label">Turno</span>
                <select name="turno" value={form.turno} onChange={handleChange} className="agregar-alumno-select">
                  {TURNO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="en-perfil-field">
                <span className="en-perfil-field-label">Día</span>
                <select name="dia" value={form.dia} onChange={handleChange} className="agregar-alumno-select">
                  {DIA_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="en-perfil-field">
                <span className="en-perfil-field-label">Hora Entrada</span>
                <input type="time" name="hora_entrada" value={form.hora_entrada} onChange={handleChange} className="agregar-alumno-input" required />
              </div>
              <div className="en-perfil-field">
                <span className="en-perfil-field-label">Hora Salida</span>
                <input type="time" name="hora_salida" value={form.hora_salida} onChange={handleChange} className="agregar-alumno-input" />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button type="submit" className="agregar-alumno-btn agregar-alumno-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Save size={16} /> Guardar Registro
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="sh-card">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Cargando registros...</p>
        ) : registros.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No hay registros de asistencia.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--gray-200)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11 }}>Nombre</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11 }}>Cargo</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11 }}>Turno</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11 }}>Día</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11 }}>Entrada</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11 }}>Salida</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11 }}>Estado</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11 }}>Firma</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>{r.apellido}, {r.nombre}</td>
                    <td style={{ padding: '10px 8px' }}>{r.cargo}</td>
                    <td style={{ padding: '10px 8px' }}>{r.turno}</td>
                    <td style={{ padding: '10px 8px' }}>{r.dia}</td>
                    <td style={{ padding: '10px 8px' }}>{r.hora_entrada}</td>
                    <td style={{ padding: '10px 8px' }}>{r.hora_salida || '-'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ color: getEstadoColor(r.estado), fontWeight: 600 }}>{r.estado}</span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <button onClick={() => toggleFirma(r.id, r.firma)} style={{
                        background: r.firma ? '#059669' : '#d1d5db', border: 'none', borderRadius: 6,
                        padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {r.firma ? <><CheckCircle2 size={14} /> Firmado</> : <><XCircle size={14} /> Pendiente</>}
                      </button>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button onClick={() => eliminar(r.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
