import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react';
import { Calendar, GraduationCap, Printer } from 'lucide-react'
import CustomSelect from '../../components/CustomSelect'
import { getFranjas, getCiclo } from '../../utils/horarioUtils';
import HorarioGrid from '../../components/specific/HorarioGrid'
import '../../shared.css'
import '../estudiante/EstudianteModule.css'
import { API_BASE } from '../../config'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

// cursos will be loaded from API

import { exportHorariosCSV } from '../../utils/exportUtils'
const DIAS_COMPLETO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']


export default function PreceptorHorarios() {
  const [cursos, setCursos] = useState([])
  const [horarios, setHorarios] = useState([])
  const [materias, setMaterias] = useState([])
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      apiFetch(`${API_BASE}/horarios/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      apiFetch(`${API_BASE}/materias/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : [])
    ])
      .then(([cursosData, horariosData, materiasData]) => {
        const mappedCursos = cursosData.map(item => ({ id: item.id, nombre: `${item.año}° ${item.division}` }))
        setCursos(mappedCursos)
        if (mappedCursos.length) setCursoSeleccionado(previous => previous || mappedCursos[0].id)
        
        const mmap = {}
        materiasData.forEach(m => { mmap[m.id] = m })
        setMaterias(materiasData)

        const mappedHorarios = horariosData.map(item => ({
          id: item.id,
          dia: item.dia,
          franja: item.franja,
          curso: item.curso,
          materia: mmap[item.materia]?.nombre || `Materia #${item.materia}`,
          profesor: item.profesor_nombre || '-',
          aula: item.aula || '-',
        }))
        setHorarios(mappedHorarios)
      })
      .catch(() => {})
  }, [])

  const cursoLabel = (cursos.find(c => c.id === cursoSeleccionado) || {}).nombre || ''
  const franjas = getFranjas(getCiclo(cursoLabel))
  const horariosCurso = horarios.filter(h => h.curso === cursoSeleccionado)

  const COLOR_PALETTE = [
    { bg: '#dbeafe', color: '#1d4ed8' },
    { bg: '#fce7f3', color: '#be185d' },
    { bg: '#fef9c3', color: '#a16207' },
    { bg: '#dcfce7', color: '#15803d' },
    { bg: '#f3e8ff', color: '#7c3aed' },
  ]
  const MATERIA_COLORS = {}
  materias.forEach((m, i) => {
    MATERIA_COLORS[m.nombre] = COLOR_PALETTE[i % COLOR_PALETTE.length]
  })
  const handleExportPDF = () => {
    const content = document.querySelector('.en-horario-grid') || document.querySelector('.sh-card table')
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
      </style></head><body>${content.innerHTML}</body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Horarios</h2>
          <p className="sh-hero-subtitle">
            Visualizá los horarios de cada curso
          </p>
        </div>
      </div>

      <div className="sh-filters-container">
        <div className="sh-filters-grid">
          <div className="sh-filter-group">
            <label className="sh-filter-label">Curso</label>
            <CustomSelect
              options={cursos.map((c) => ({ value: c.id, label: c.nombre }))}
              value={cursoSeleccionado || ''}
              onChange={(e) => setCursoSeleccionado(Number(e.target.value))}
              placeholder="Seleccione un curso..."
              icon={GraduationCap}
            />
          </div>
        </div>
      </div>

      <div className="sh-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="sh-card-title" style={{ margin: 0 }}>
            <Calendar size={17} /> Horario Semanal — {cursoLabel}
          </h2>
          <button className="sh-btn-ghost" onClick={handleExportPDF} title="Exportar PDF" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', color: '#333', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
            <Printer size={16} /> Exportar PDF
          </button>
          <button 
            onClick={() => exportHorariosCSV(horariosCurso, franjas, DIAS_COMPLETO, `horarios_${cursoLabel.replace(' ', '_')}.csv`)} 
            className="sh-btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', color: '#333', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Exportar CSV
          </button>
        </div>

        <HorarioGrid franjas={franjas} horarios={horariosCurso} materiaColors={MATERIA_COLORS} />
      </div>
    </div>
  )
}


