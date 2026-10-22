import LiveRecords from '../shared/LiveRecords'
const columns=[{key:'usuario_nombre',label:'Lector'},{key:'libro_titulo',label:'Libro'},{key:'estado',label:'Estado'},{key:'fecha_prestamo',label:'Fecha del préstamo'}]
export default function BibliotecaLectores(){return <LiveRecords title="Lectores con préstamos registrados" endpoint="/api/prestamos/" columns={columns}/>}
