import LiveRecords from '../shared/LiveRecords'
const columns=[{key:'estudiante_nombre',label:'Estudiante'},{key:'materia_nombre',label:'Materia'},{key:'ausentes',label:'Ausencias registradas'}]
const alerts=rows=>rows.filter(row=>row.ausentes>10)
export default function DirectorAlertas(){return <LiveRecords title="Seguimiento de inasistencias" endpoint="/api/asistencias/" columns={columns} selectRows={alerts}/>}
