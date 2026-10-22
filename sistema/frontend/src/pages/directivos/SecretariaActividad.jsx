import LiveRecords from '../shared/LiveRecords'
const columns=[{key:'texto',label:'Actividad'},{key:'tiempo',label:'Fecha'}]
const activity=data=>data.actividad
export default function SecretariaActividad(){return <LiveRecords title="Actividad institucional reciente" endpoint="/api/dashboard/stats/" columns={columns} selectRows={activity}/>}
