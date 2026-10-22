import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'
import { GraduationCap, Users, Search } from 'lucide-react'
import './SecretariaDireccion.css'
import '../../shared.css'
import { API_BASE } from '../../config'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

function buildCursoLabel(año, division) {
  if (!año || !division) return '-'
  return `${año}° ${division}`
}

export default function SecretariaEstudiantes() {
  const [search, setSearch] = useState('')
  const [cursoFiltro, setCursoFiltro] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('')
  const [turnoFiltro, setTurnoFiltro] = useState('')
  const [estudiantes, setEstudiantes] = useState([])
  const [cursos, setCursos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [turnos, setTurnos] = useState([])

  useEffect(() => {
    // Cargar alumnos y cursos desde la API
    Promise.all([apiFetch(`${API_BASE}/alumnos/`, {
  headers: authHeaders()
}).then(r => r.ok ? r.json() : []), apiFetch(`${API_BASE}/cursos/`, {
  headers: authHeaders()
}).then(r => r.ok ? r.json() : [])]).then(([alumnosData]) => {
  const mapped = alumnosData.map(a => ({
    id: a.id,
    Nombre: a.nombre,
    Apellido: a.apellido,
    DNI: a.dni,
    Id_cursos: a.año && a.division ? `${a.año}-${a.division}` : null,
    Curso: buildCursoLabel(a.año, a.division),
    Turno: a.turno || '-',
    Grupo: a.grupo || '-',
    Numero_Legajo: a.id?.toString() || '-',
    Telefono: a.telefono_padre || '-'
  }));
  setEstudiantes(mapped);
  setCursos([...new Set(mapped.map(m => m.Curso))]);
  setGrupos([...new Set(mapped.map(m => m.Grupo))]);
  setTurnos([...new Set(mapped.map(m => m.Turno))]);
}).catch(() => {})
  }, [])

  const filtrados = estudiantes.filter(e => {
    const nom = `${e.Nombre} ${e.Apellido}`.toLowerCase()
    if (search && !nom.includes(search.toLowerCase())) return false
    if (cursoFiltro && e.Curso !== cursoFiltro) return false
    if (grupoFiltro && e.Grupo !== grupoFiltro) return false
    if (turnoFiltro && e.Turno !== turnoFiltro) return false
    return true
  })

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><GraduationCap size={24} /> Gestión de Estudiantes</h2>
          <p className="sh-hero-subtitle">Administración de legajos y datos de alumnos</p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Búsqueda</label>
            <div className="sh-input-group">
              <Search size={18} className="sh-input-icon" />
              <input placeholder="Nombre o apellido..." className="sh-input sh-input-with-icon" type="text" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Curso</label>
            <select value={cursoFiltro} onChange={e => setCursoFiltro(e.target.value)} className="sh-select">
              <option value="">Todos</option>
              {cursos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Grupo</label>
            <select value={grupoFiltro} onChange={e => setGrupoFiltro(e.target.value)} className="sh-select">
              <option value="">Todos</option>
              {grupos.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="sh-filter-group">
            <label className="sh-filter-label">Turno</label>
            <select value={turnoFiltro} onChange={e => setTurnoFiltro(e.target.value)} className="sh-select">
              <option value="">Todos</option>
              {turnos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="sh-card" style={{ overflowX: 'auto' }}>
        <h3 className="sh-card-title"><Users size={17} /> Estudiantes ({filtrados.length})</h3>
        <table className="en-table">
          <thead className="en-thead">
            <tr className="en-tr">
              <th className="en-th">Legajo</th>
              <th className="en-th">Nombre</th>
              <th className="en-th">Apellido</th>
              <th className="en-th">DNI</th>
              <th className="en-th">Curso</th>
              <th className="en-th">Turno</th>
              <th className="en-th">Grupo</th>
              <th className="en-th">Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(e => (
              <tr key={e.id} className="en-tr">
                <td className="en-td"><span style={{ fontWeight: 600, fontSize: '13px' }}>{e.Numero_Legajo}</span></td>
                <td className="en-td">{e.Nombre}</td>
                <td className="en-td">{e.Apellido}</td>
                <td className="en-td">{e.DNI}</td>
                <td className="en-td">{e.Curso}</td>
                <td className="en-td">
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                    background: e.Turno === 'Mañana' ? '#dbeafe' : '#fef3c7',
                    color: e.Turno === 'Mañana' ? '#1e40af' : '#92400e'
                  }}>{e.Turno}</span>
                </td>
                <td className="en-td">{e.Grupo}</td>
                <td className="en-td">{e.Telefono}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
