import { AttendanceHistory } from '../shared/DailyAttendance'
export default function FamiliaAsistencia({estudiante}) { return <div className="sh-page"><AttendanceHistory studentId={estudiante?.id}/></div> }
