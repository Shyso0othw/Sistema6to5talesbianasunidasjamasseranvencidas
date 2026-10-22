import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react';
import { Calendar, MapPin, Printer } from 'lucide-react'
import { getFranjas, getCiclo } from '../../utils/horarioUtils';
import HorarioGrid from '../../components/specific/HorarioGrid'
import { exportHorariosCSV } from '../../utils/exportUtils'
import { API_BASE } from '../../config'
import '../estudiante/EstudianteModule.css'



const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function FamiliaHorarios({ estudiante }) {
  const cursoLabel = estudiante?.curso || '—'
  const franjas = getFranjas(getCiclo(cursoLabel))
  const [horarios, setHorarios] = useState([])
  const [materias, setMaterias] = useState([])

  useEffect(() => {
    if (!estudiante?.id) return
    const t = getToken()
    if (!t) return

    Promise.all([
      apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      apiFetch(`${API_BASE}/materias/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : [])
    ]).then(([cursosData, materiasData]) => {
      const match = cursosData.find(c => c.año === estudiante._alumno?.año && c.division === estudiante._alumno?.division)
      if (match) {
        apiFetch(`${API_BASE}/horarios/?curso=${match.id}`, { headers: authHeaders() })
          .then(r => r.ok ? r.json() : [])
          .then(horariosData => {
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
      }
    })
  }, [estudiante])

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
          <h2 className="sh-hero-title">Horario Escolar</h2>
          <p className="sh-hero-subtitle">
            {estudiante?.nombre || 'Valentín López'} · {estudiante?.curso || '3° Año A · Grupo A'}
          </p>
        </div>
      </div>

      <div className="sh-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="sh-card-title" style={{ margin: 0 }}>
            <Calendar size={17} /> Horario Semanal
          </h2>
          <button className="sh-btn-ghost" onClick={handleExportPDF} title="Exportar PDF" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', color: '#333', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
            <Printer size={16} /> Exportar PDF
          </button>
          <button 
            onClick={() => exportHorariosCSV(horarios, franjas, ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], `horarios_${cursoLabel.replace(' ', '_')}.csv`)} 
            className="sh-btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', color: '#333', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Exportar CSV
          </button>
        </div>

        <HorarioGrid
          franjas={franjas}
          horarios={horarios}
          materiaColors={MATERIA_COLORS}
          renderCelda={(celda, colors) => (
            <>
              <span className="en-horario-materia" style={{ color: colors.color, fontWeight: '600' }}>{celda.materia}</span>
              {celda.profesor && <span className="en-horario-profesor" style={{ color: colors.color, fontSize: '11px' }}>{celda.profesor}</span>}
              {celda.aula && <span className="en-horario-aula" style={{ color: colors.color, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={10} /> {celda.aula}</span>}
            </>
          )}
        />
      </div>
    </div>
  )
}


