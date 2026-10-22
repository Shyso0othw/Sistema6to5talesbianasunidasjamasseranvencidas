import { useEffect, useState } from 'react'
import { fetchHorariosPorCurso } from '../api/horarios'

export function useHorariosPorCurso(cursoId) {
  const [result, setResult] = useState(null)
  useEffect(() => {
    if (!cursoId) return
    let cancelled = false
    fetchHorariosPorCurso(cursoId).then(horarios => {
      if (!cancelled) setResult({cursoId, horarios, error: null})
    }).catch(error => {
      if (!cancelled) setResult({cursoId, horarios: [], error: error.message || String(error)})
    })
    return () => { cancelled = true }
  }, [cursoId])
  const current = result?.cursoId === cursoId ? result : null
  return {horarios: current?.horarios || [], loading: Boolean(cursoId && !current), error: current?.error || null}
}
