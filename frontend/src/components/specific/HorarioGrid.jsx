
import { MapPin } from 'lucide-react'
import { DIAS } from "../../utils/horarioUtils"

function defaultRenderCelda(celda, colors) {
  return (
    <>
      <span className="en-horario-materia" style={{ color: colors.color }}>{celda.materia}</span>
      {celda.profesor && <span className="en-horario-profesor" style={{ color: colors.color }}>{celda.profesor}</span>}
      {celda.aula && <span className="en-horario-aula" style={{ color: colors.color }}><MapPin size={10} /> {celda.aula}</span>}
    </>
  )
}

export default function HorarioGrid({ franjas, horarios, materiaColors, renderCelda, onMove, onEdit, onDelete }) {
  const celdaFn = renderCelda || defaultRenderCelda
  return (
    <div className="en-horario-grid">
      <div className="en-horario-header">
        <div className="en-horario-header-cell">Horario</div>
        {DIAS.map(d => (
          <div key={d} className="en-horario-header-cell">{d}</div>
        ))}
      </div>
      {franjas.map((f, fi) => {
        if (f.tipo === 'recreo' || f.tipo === 'receso') {
          const label = f.tipo === 'receso' ? 'RECESO' : 'RECREO'
          return (
            <div key={fi} className="en-horario-row" style={{ background: '#fafafa' }}>
              <div className="en-horario-time" style={{ background: '#f5f5f5' }}>
                <span>{f.inicio}</span>
                <span>{f.fin}</span>
              </div>
              <div style={{ gridColumn: '2 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label} · {f.inicio} – {f.fin}
                </span>
              </div>
            </div>
          )
        }
        return (
          <div key={fi} className="en-horario-row">
            <div className="en-horario-time">
              <span>{f.inicio}</span>
              <span>{f.fin}</span>
            </div>
            {DIAS.map((_, di) => {
              const celda = horarios.find(h => h.dia === di && h.franja === fi)
              const colors = celda ? (materiaColors[celda.materia] || { bg: '#f0f0f0', color: '#333' }) : null
              return (
                <div
                  key={di}
                  className="en-horario-cell"
                  draggable={!!celda && !!onMove}
                  onDragStart={e => {
                    if (!celda) return
                    e.dataTransfer.setData('text/plain', JSON.stringify({ id: celda.id, dia: celda.dia, franja: celda.franja }))
                  }}
                  onDragOver={e => {
                    if (!onMove) return
                    // bloquear drag over si la franja objetivo es recreo o receso
                    const targetFranja = franjas[fi]
                    const forbidden = targetFranja && (targetFranja.tipo === 'recreo' || targetFranja.tipo === 'receso')
                    if (!forbidden) e.preventDefault()
                  }}
                  onDrop={e => {
                    if (!onMove) return
                    const targetFranja = franjas[fi]
                    const forbidden = targetFranja && (targetFranja.tipo === 'recreo' || targetFranja.tipo === 'receso')
                    if (forbidden) {
                      // feedback al usuario
                      try { window.navigator.vibrate?.(50) } catch { console.debug('Vibración no disponible') }
                      alert('No se puede mover a una franja de recreo/receso')
                      return
                    }
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
                      const id = data.id
                      onMove(id, di, fi)
                    } catch {
  // ignore
}
                  }}
                  style={celda ? {
                    background: colors.bg,
                    borderRadius: 8,
                    margin: 4,
                    minHeight: 'calc(60px - 8px)',
                    position: 'relative'
                  } : {}}
                >
                  {celda ? (
                    <>
                      {celdaFn(celda, colors)}
                      <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 6 }}>
                        {onEdit && <button onClick={() => onEdit(celda)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✎</button>}
                        {onDelete && <button onClick={() => onDelete(celda.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>🗑</button>}
                      </div>
                    </>
                  ) : <span className="en-horario-cell--empty">—</span>}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
