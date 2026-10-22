import { useState } from 'react'
import DailyAttendance from '../shared/DailyAttendance'
import CargaAsistencia from '../shared/CargaAsistencia'
export default function PreceptorAsistencia() {
 const [mode,setMode]=useState('diaria')
 return <><label>Tipo de registro <select value={mode} onChange={e=>setMode(e.target.value)}><option value="diaria">Asistencia diaria</option><option value="materia">Acumulados por materia</option></select></label>{mode==='diaria' ? <DailyAttendance/> : <CargaAsistencia/>}</>
}
