import { AttendanceHistory } from '../../pages/shared/DailyAttendance'
export default function AlumnoAdministracion({alumno, onBack}) {
  return <div className="sh-page"><button onClick={onBack}>Volver</button><AttendanceHistory studentId={alumno?.id || alumno?.legajo} /></div>
}
